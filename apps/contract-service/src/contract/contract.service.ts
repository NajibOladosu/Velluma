import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';
import * as CryptoJS from 'crypto-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SignContractDto,
  GenerateContractDto,
  ChangeRequestDto,
} from './dto/contract.dto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private readonly gemini: GoogleGenerativeAI | null;

  constructor(private supabase: SupabaseService) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.gemini = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_GENERATIVE_AI_API_KEY not set — AI generation disabled',
      );
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.gemini) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.25,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async generateFromPrompt(data: GenerateContractDto) {
    const client = this.supabase.getClient();

    // 1. Generate contract content via Gemini 2.0 Flash
    let contractTitle = 'AI Generated Contract';
    let content: string;
    let sections: unknown[] = [];

    try {
      const systemPrompt = `You are ContractAI, Velluma's expert contract drafting engine. Generate a complete, professional, legally-sound freelance contract. Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Contract title",
  "summary": "One sentence summary",
  "sections": [
    { "id": "slug", "title": "N. Section Title", "content": "Full section text with \\n\\n paragraph breaks" }
  ]
}
Include all standard sections: Parties, Scope of Work, Timeline, Payment Terms, IP Rights, Confidentiality, Revisions Policy, Warranties, Limitation of Liability, Termination, Dispute Resolution, Governing Law, General Provisions.`;

      const userPrompt = `Generate a complete freelance contract for the following project:\n\n${data.prompt}`;
      const rawText = await this.callGemini(
        `${systemPrompt}\n\n---\n\n${userPrompt}`,
      );

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/\s*```\s*$/im, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      contractTitle = parsed.title ?? contractTitle;
      sections = parsed.sections ?? [];
      content = sections
        .map((s: Record<string, string>) => `## ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');

      this.logger.log(`Contract generated: ${contractTitle}`);
    } catch (err) {
      this.logger.error('Gemini generation failed, using fallback', err);
      content = `# Service Agreement\n\nThis agreement is for: ${data.prompt}\n\n[AI generation failed — please edit this draft manually.]`;
    }

    // 2. Persist contract row
    const { data: contract, error: contractError } = await client
      .from('contracts')
      .insert([
        {
          tenant_id: data.tenantId,
          creator_id: data.userId,
          client_id: data.clientId,
          template_id: data.templateId,
          title: contractTitle,
          status: 'draft',
          ai_enhanced: true,
          original_description: data.prompt,
          content: { sections },
          generation_status: 'completed',
          generation_metadata: {
            model: 'gemini-2.5-flash',
            generatedAt: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (contractError) throw contractError;

    // 3. Persist initial document version (best-effort)
    const { error: versionError } = await client
      .from('contract_documents')
      .insert([
        {
          contract_id: contract.id,
          author_id: data.userId,
          content: JSON.stringify({ sections }),
          source: 'ai',
          ai_prompt: data.prompt,
          regen_number: 0,
        },
      ]);

    if (versionError) {
      this.logger.warn(
        'contract_documents insert failed (non-fatal):',
        versionError.message,
      );
    }

    return { contractId: contract.id, content, sections };
  }

  async signContract(data: SignContractDto) {
    const client = this.supabase.getClient();

    // 1. Fetch current contract state
    const { data: contract, error: fetchError } = await client
      .from('contracts')
      .select('*')
      .eq('id', data.contractId)
      .single();

    if (fetchError || !contract) throw new Error('Contract not found');

    // 2. Prevent duplicate signatures from the same user on the same contract
    const { data: existing } = await client
      .from('contract_signatures')
      .select('id')
      .eq('contract_id', data.contractId)
      .eq('user_id', data.userId)
      .maybeSingle();

    if (existing) {
      throw new Error(
        `User ${data.userId} has already signed contract ${data.contractId}`,
      );
    }

    // 3. Generate cryptographic hash of the latest document version
    const { data: latestDoc } = await client
      .from('contract_documents')
      .select('*')
      .eq('contract_id', data.contractId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const agreementPayload = JSON.stringify({
      contractId: contract.id,
      content: latestDoc?.content,
      timestamp: new Date().toISOString(),
    });

    const agreementHash = CryptoJS.SHA256(agreementPayload).toString();

    // 4. Record signature
    const { error: sigError } = await client
      .from('contract_signatures')
      .insert([
        {
          contract_id: data.contractId,
          tenant_id: data.tenantId,
          user_id: data.userId,
          signer_role: data.role,
          signature_data: data.signatureBase64,
          signature_type: 'canvas',
          version_id: latestDoc?.id,
        },
      ]);

    if (sigError) throw sigError;

    // 5. Record audit log
    await client.from('audit_logs').insert([
      {
        tenant_id: data.tenantId,
        user_id: data.userId,
        action: 'contract_signed',
        resource_type: 'contract',
        resource_id: data.contractId,
        metadata: {
          agreement_hash: agreementHash,
          role: data.role,
        },
      },
    ]);

    // 6. Check if all parties signed and finalize
    const { data: isFinalized } = await client.rpc(
      'finalize_contract_if_all_signed',
      {
        p_contract_id: data.contractId,
      },
    );

    return {
      success: true,
      agreementHash,
      isFinalized,
      signedAt: new Date().toISOString(),
    };
  }

  async createChangeRequest(data: ChangeRequestDto) {
    const client = this.supabase.getClient();

    const { data: request, error } = await client
      .from('contract_change_requests')
      .insert([
        {
          contract_id: data.contractId,
          tenant_id: data.tenantId,
          requester_id: data.requesterId,
          details: data.details,
          proposed_changes: data.proposedChanges,
          status: 'open',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return request;
  }

  async getAuditLog(contractId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('audit_logs')
      .select('*')
      .eq('resource_id', contractId)
      .eq('resource_type', 'contract')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
