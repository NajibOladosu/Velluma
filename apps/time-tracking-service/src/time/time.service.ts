import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class TimeService {
  private readonly logger = new Logger(TimeService.name);

  constructor(private supabase: SupabaseService) {}

  /**
   * Starts a timer by creating an active time_tracking_sessions record.
   * Note: projectId is treated as contractId because the gateway conflates the two.
   */
  async startTimer(data: {
    projectId: string;
    userId: string;
    tenantId: string;
    taskDescription?: string;
  }) {
    const { data: session, error } = await this.supabase
      .getClient()
      .from('time_tracking_sessions')
      .insert([
        {
          contract_id: data.projectId,
          freelancer_id: data.userId,
          task_description: data.taskDescription ?? 'Work session',
          start_time: new Date().toISOString(),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error starting timer: ${error.message}`);
      throw new Error('Failed to start timer');
    }

    return session;
  }

  /**
   * Stops a running session and creates a draft time_entry with the calculated duration.
   */
  async stopTimer(timerId: string) {
    const client = this.supabase.getClient();

    const { data: session, error: fetchError } = await client
      .from('time_tracking_sessions')
      .select('*')
      .eq('id', timerId)
      .single();

    if (fetchError || !session) throw new Error('Timer session not found');

    const stoppedAt = new Date();
    const startedAt = new Date(session.start_time);
    const durationMinutes = Math.round(
      (stoppedAt.getTime() - startedAt.getTime()) / 60_000,
    );

    // Mark session as inactive
    const { data: stopped, error: updateError } = await client
      .from('time_tracking_sessions')
      .update({
        is_active: false,
        last_activity: stoppedAt.toISOString(),
      })
      .eq('id', timerId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create a draft time_entry for review/approval
    const { data: entry, error: entryError } = await client
      .from('time_entries')
      .insert([
        {
          contract_id: session.contract_id,
          freelancer_id: session.freelancer_id,
          task_description: session.task_description,
          start_time: session.start_time,
          end_time: stoppedAt.toISOString(),
          duration_minutes: durationMinutes,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (entryError) {
      this.logger.warn(
        `Timer stopped but time_entry creation failed: ${entryError.message}`,
      );
    }

    return { session: stopped, entry: entry ?? null, durationMinutes };
  }

  /**
   * Lists time entries (completed sessions) for a project/contract.
   */
  async listTimers(projectId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('time_entries')
      .select('*')
      .eq('contract_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Creates a manual time entry (bypasses the session/timer flow).
   */
  async createTimeEntry(data: {
    contractId: string;
    userId: string;
    taskDescription: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    hourlyRate?: number;
  }) {
    const { data: entry, error } = await this.supabase
      .getClient()
      .from('time_entries')
      .insert([
        {
          contract_id: data.contractId,
          freelancer_id: data.userId,
          task_description: data.taskDescription,
          start_time: data.startTime,
          end_time: data.endTime,
          duration_minutes: data.durationMinutes,
          hourly_rate: data.hourlyRate ?? null,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating time entry: ${error.message}`);
      throw new Error('Failed to create time entry');
    }

    return entry;
  }

  /**
   * Submits a draft time entry for approval.
   */
  async submitTimeEntry(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('time_entries')
      .update({ status: 'submitted' })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw new Error(`Failed to submit time entry: ${error.message}`);
    if (!data) throw new Error('Time entry not found or already submitted');
    return data;
  }

  /**
   * Approves a submitted time entry.
   */
  async approveTimeEntry(id: string, approverId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('time_entries')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'submitted')
      .select()
      .single();

    if (error) throw new Error(`Failed to approve time entry: ${error.message}`);
    if (!data) throw new Error('Time entry not found or not in submitted state');
    return data;
  }

  /**
   * Rejects a submitted time entry with optional feedback.
   */
  async rejectTimeEntry(id: string, approverId: string, reason?: string) {
    const updatePayload: Record<string, unknown> = {
      status: 'rejected',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    };
    if (reason) updatePayload['rejection_reason'] = reason;

    const { data, error } = await this.supabase
      .getClient()
      .from('time_entries')
      .update(updatePayload)
      .eq('id', id)
      .eq('status', 'submitted')
      .select()
      .single();

    if (error) throw new Error(`Failed to reject time entry: ${error.message}`);
    if (!data) throw new Error('Time entry not found or not in submitted state');
    return data;
  }
}
