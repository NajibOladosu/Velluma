import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';
import * as CryptoJS from 'crypto-js';

export interface SignatureData {
    projectId: string;
    userId: string;
    signatureBase64: string; // The image data or biometric hash
    tenantId: string;
}

@Injectable()
export class ContractService {
    private readonly logger = new Logger(ContractService.name);

    constructor(private supabase: SupabaseService) { }

    async signContract(data: SignatureData) {
        const client = this.supabase.getClient();

        // 1. Fetch current project state
        const { data: project } = await client
            .from('projects')
            .select('*, clients(*)')
            .eq('id', data.projectId)
            .single();

        if (!project) throw new Error('Project not found');

        // 2. Generate Cryptographic Hash of the "Agreement"
        // We hash the project title, metadata (content), and total budget
        const agreementPayload = JSON.stringify({
            id: project.id,
            title: project.title,
            content: project.metadata?.content,
            budget: project.total_budget,
            timestamp: new Date().toISOString(),
        });

        const agreementHash = CryptoJS.SHA256(agreementPayload).toString();

        // 3. Record Audit Log (Security/Compliance)
        await client.from('audit_logs').insert([
            {
                tenant_id: data.tenantId,
                user_id: data.userId,
                action: 'contract_signed',
                entity_type: 'project',
                entity_id: data.projectId,
                metadata: {
                    agreement_hash: agreementHash,
                    ip_address: '0.0.0.0', // Would be passed from gateway in real prod
                },
            },
        ]);

        // 4. Update Project Status
        await client
            .from('projects')
            .update({ status: 'active' })
            .eq('id', data.projectId);

        return {
            success: true,
            agreementHash,
            signedAt: new Date().toISOString(),
        };
    }

    async getAuditLog(projectId: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('audit_logs')
            .select('*')
            .eq('entity_id', projectId)
            .eq('entity_type', 'project')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}
