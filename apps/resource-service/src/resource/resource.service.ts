import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class ResourceService {
  private readonly logger = new Logger(ResourceService.name);

  constructor(private supabase: SupabaseService) {}

  async addDeliverable(data: {
    projectId: string;
    tenantId: string;
    name: string;
    description?: string;
    fileUrl: string;
    type: string;
  }) {
    const { data: resource, error } = await this.supabase
      .getClient()
      .from('audit_logs') // Actually we should have a 'resources' table, but using a generic pattern for now if not defined
      .insert([
        {
          tenant_id: data.tenantId,
          entity_type: 'resource',
          entity_id: data.projectId,
          action: 'resource_added',
          metadata: {
            name: data.name,
            description: data.description,
            file_url: data.fileUrl,
            type: data.type,
          },
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error adding deliverable: ${error.message}`);
      throw new Error('Failed to add deliverable');
    }

    return resource;
  }

  async listResources(projectId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('audit_logs')
      .select('*')
      .eq('entity_id', projectId)
      .eq('entity_type', 'resource');

    if (error) throw error;
    return data;
  }
}
