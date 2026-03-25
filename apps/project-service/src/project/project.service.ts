import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private supabase: SupabaseService) {}

  async getProjectKanban(projectId: string) {
    const { data: milestones, error } = await this.supabase
      .getClient()
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return milestones;
  }

  async createMilestone(data: {
    projectId: string;
    tenantId: string;
    title: string;
    description?: string;
    amount: number;
    dueDate?: string;
  }) {
    const { data: milestone, error } = await this.supabase
      .getClient()
      .from('milestones')
      .insert([
        {
          project_id: data.projectId,
          tenant_id: data.tenantId,
          title: data.title,
          description: data.description,
          amount: data.amount,
          due_date: data.dueDate,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating milestone: ${error.message}`);
      throw new Error('Failed to create milestone');
    }

    return milestone;
  }

  async updateMilestoneStatus(data: { milestoneId: string; status: string }) {
    const { data: milestone, error } = await this.supabase
      .getClient()
      .from('milestones')
      .update({ status: data.status })
      .eq('id', data.milestoneId)
      .select()
      .single();

    if (error) throw error;
    return milestone;
  }
}
