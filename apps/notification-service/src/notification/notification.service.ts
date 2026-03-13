import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private supabase: SupabaseService) { }

    async sendEmail(data: {
        to: string;
        subject: string;
        template: 'proposal_sent' | 'contract_active' | 'payment_held';
        variables: any;
    }) {
        // In a real production app, we would integrate with Resend, Postmark, or SendGrid
        this.logger.log(`Dispatching email to ${data.to} with subject: ${data.subject}`);

        // We record the notification in audit_logs for traceability
        await this.supabase.getClient().from('audit_logs').insert([
            {
                entity_type: 'notification',
                action: 'email_sent',
                metadata: {
                    to: data.to,
                    subject: data.subject,
                    template: data.template,
                    variables: data.variables,
                    themed: 'Cosmic Navy',
                },
            },
        ]);

        return { success: true, messageId: Math.random().toString(36).substring(7) };
    }

    async sendSms(data: { to: string; message: string }) {
        // Integration with Twilio or Vonage
        this.logger.log(`Dispatching SMS to ${data.to}`);
        return { success: true };
    }

    async listNotifications(tenantId: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('audit_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('entity_type', 'notification');

        if (error) throw error;
        return data;
    }
}
