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
      .from('project_deliverables')
      .insert([
        {
          project_id: data.projectId,
          tenant_id: data.tenantId,
          name: data.name,
          description: data.description ?? null,
          file_url: data.fileUrl,
          type: data.type,
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
      .from('project_deliverables')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
