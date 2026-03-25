import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private supabase: SupabaseService) {}

  async listClients(tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data;
  }

  async createClient(data: {
    tenantId: string;
    name: string;
    email: string;
    company?: string;
  }) {
    const { data: client, error } = await this.supabase
      .getClient()
      .from('clients')
      .insert([
        {
          tenant_id: data.tenantId,
          name: data.name,
          email: data.email,
          company: data.company,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating client: ${error.message}`);
      throw new Error('Failed to create client');
    }

    return client;
  }

  async getClientDetails(clientId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('clients')
      .select('*, projects(*)')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  }
}
