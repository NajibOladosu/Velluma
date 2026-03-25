import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

export interface ProposalData {
  title: string;
  description?: string;
  content: any; // TipTap JSON
  clientId: string;
  tenantId: string;
}

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  constructor(private supabase: SupabaseService) {}

  async createProposal(data: ProposalData) {
    const { data: project, error } = await this.supabase
      .getClient()
      .from('projects')
      .insert([
        {
          tenant_id: data.tenantId,
          client_id: data.clientId,
          title: data.title,
          description: data.description,
          status: 'draft',
          metadata: { content: data.content },
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating proposal: ${error.message}`);
      throw new Error('Failed to create proposal');
    }

    return project;
  }

  async getProposal(projectId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('projects')
      .select('*, clients(*)')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProposal(projectId: string, content: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('projects')
      .update({ metadata: { content } })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
