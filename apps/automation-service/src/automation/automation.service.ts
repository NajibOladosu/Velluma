import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class AutomationService {
    private readonly logger = new Logger(AutomationService.name);

    constructor(private supabase: SupabaseService) { }

    async createRule(data: {
        tenantId: string;
        trigger: string;
        action: string;
        conditions?: any;
    }) {
        const { data: rule, error } = await this.supabase
            .getClient()
            .from('audit_logs') // Using audit_logs for rule storage temporarily
            .insert([
                {
                    tenant_id: data.tenantId,
                    entity_type: 'automation_rule',
                    action: 'rule_created',
                    metadata: {
                        trigger: data.trigger,
                        action: data.action,
                        conditions: data.conditions,
                    },
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
            .from('audit_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('entity_type', 'automation_rule');

        if (error) throw error;
        return data;
    }

    async triggerEvent(data: { tenantId: string; event: string; payload: any }) {
        this.logger.log(`Event triggered: ${data.event} for tenant ${data.tenantId}`);
        // Logic to evaluate rules and dispatch actions
        return { success: true, processedEvents: 0 };
    }
}
