import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private supabase: SupabaseService) {}

  async createRule(data: {
    tenantId: string;
    trigger: string;
    action: string;
    conditions?: any;
    name?: string;
  }) {
    const { data: rule, error } = await this.supabase
      .getClient()
      .from('automation_rules')
      .insert([
        {
          tenant_id: data.tenantId,
          name: data.name ?? 'Untitled Rule',
          trigger: data.trigger,
          action: data.action,
          conditions: data.conditions ?? {},
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating automation rule: ${error.message}`);
      throw new Error('Failed to create automation rule');
    }

    return rule;
  }

  async listRules(tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('automation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async triggerEvent(data: { tenantId: string; event: string; payload: any }) {
    this.logger.log(
      `Event triggered: ${data.event} for tenant ${data.tenantId}`,
    );

    // Fetch all active rules for this tenant that match the event trigger
    const { data: rules, error } = await this.supabase
      .getClient()
      .from('automation_rules')
      .select('*')
      .eq('tenant_id', data.tenantId)
      .eq('trigger', data.event)
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Failed to fetch rules: ${error.message}`);
      return { success: false, processedEvents: 0 };
    }

    // TODO: implement action dispatching per rule (e.g. send notification, update status)
    // For now we log matched rules; wiring to action handlers is a follow-up task.
    const matchedCount = rules?.length ?? 0;
    if (matchedCount > 0) {
      this.logger.log(
        `Found ${matchedCount} rule(s) matching trigger "${data.event}" for tenant ${data.tenantId}`,
      );
    }

    return { success: true, processedEvents: matchedCount };
  }
}
