import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(private supabase: SupabaseService) {}

  async getProjectProfitability(projectId: string) {
    const client = this.supabase.getClient();

    // 1. Fetch total project budget
    const { data: project } = await client
      .from('projects')
      .select('total_budget')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // 2. Fetch total logged time (from audit_logs)
    const { data: logs } = await client
      .from('audit_logs')
      .select('metadata')
      .eq('entity_id', projectId)
      .eq('entity_type', 'timer')
      .eq('action', 'timer_stopped');

    const totalSeconds = (logs || []).reduce(
      (acc, log) => acc + (log.metadata?.duration_seconds || 0),
      0,
    );
    const totalHours = totalSeconds / 3600;

    // 3. Calculate Effective Hourly Rate (EHR)
    const ehr = totalHours > 0 ? project.total_budget / totalHours : 0;

    return {
      totalBudget: project.total_budget,
      totalHoursLogged: totalHours,
      effectiveHourlyRate: ehr,
      profitabilityPercent: 100, // Placeholder
    };
  }

  async getTenantHealthScore(tenantId: string) {
    // Logic to aggregate all project data for a tenant
    return { healthScore: 85, averageEHR: 120 };
  }
}
