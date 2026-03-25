import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class TimeService {
  private readonly logger = new Logger(TimeService.name);

  constructor(private supabase: SupabaseService) {}

  async startTimer(data: {
    projectId: string;
    userId: string;
    tenantId: string;
  }) {
    const { data: log, error } = await this.supabase
      .getClient()
      .from('audit_logs') // Re-using audit_logs as generic store for now
      .insert([
        {
          tenant_id: data.tenantId,
          user_id: data.userId,
          entity_type: 'timer',
          entity_id: data.projectId,
          action: 'timer_started',
          metadata: { started_at: new Date().toISOString() },
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error starting timer: ${error.message}`);
      throw new Error('Failed to start timer');
    }

    return log;
  }

  async stopTimer(timerId: string) {
    const { data: timer } = await this.supabase
      .getClient()
      .from('audit_logs')
      .select('*')
      .eq('id', timerId)
      .single();

    if (!timer) throw new Error('Timer not found');

    const duration =
      (new Date().getTime() - new Date(timer.metadata.started_at).getTime()) /
      1000;

    const { data: stopped, error } = await this.supabase
      .getClient()
      .from('audit_logs')
      .update({
        action: 'timer_stopped',
        metadata: {
          ...timer.metadata,
          stopped_at: new Date().toISOString(),
          duration_seconds: duration,
        },
      })
      .eq('id', timerId)
      .select()
      .single();

    if (error) throw error;

    return stopped;
  }

  async listTimers(projectId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('audit_logs')
      .select('*')
      .eq('entity_id', projectId)
      .eq('entity_type', 'timer');

    if (error) throw error;
    return data;
  }
}
