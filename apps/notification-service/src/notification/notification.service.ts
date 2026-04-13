import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, unknown>;
    userId?: string;
  }) {
    // Store notification record in the proper notifications table
    const client = this.supabase.getClient();

    const message = this.renderTemplate(data.template, data.variables);

    await client.from('notifications').insert([
      {
        user_id: data.userId,
        type: 'email',
        title: data.subject,
        message,
        is_read: false,
      },
    ]);

    // Send via Resend if configured
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.config.get<string>('EMAIL_FROM', 'noreply@velluma.com'),
            to: data.to,
            subject: data.subject,
            html: `<p>${message}</p>`,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          this.logger.warn(`Resend delivery failed for ${data.to}: ${err}`);
          return { success: false, queued: true };
        }

        const result = (await response.json()) as { id: string };
        this.logger.log(`Email sent via Resend: ${result.id}`);
        return { success: true, messageId: result.id };
      } catch (err) {
        this.logger.error(`Resend request failed: ${(err as Error).message}`);
        return { success: false, queued: true };
      }
    }

    this.logger.warn(
      `RESEND_API_KEY not set — email to ${data.to} queued but not sent`,
    );
    return { success: true, queued: true };
  }

  async sendSms(data: { to: string; message: string; userId?: string }) {
    // Store as in-app notification until a Twilio/Vonage key is configured
    await this.supabase.getClient().from('notifications').insert([
      {
        user_id: data.userId,
        type: 'sms',
        title: 'SMS',
        message: data.message,
        is_read: false,
      },
    ]);

    // TODO: integrate Twilio when TWILIO_AUTH_TOKEN is set
    const twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    if (!twilioSid) {
      this.logger.warn(
        `TWILIO_ACCOUNT_SID not set — SMS to ${data.to} queued but not sent`,
      );
    }

    return { success: true, queued: !twilioSid };
  }

  async listNotifications(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }

  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return Object.entries(variables).reduce(
      (text, [key, value]) =>
        text.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? '')),
      template,
    );
  }
}
