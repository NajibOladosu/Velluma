import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';
import Twilio from 'twilio';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private twilioClient: ReturnType<typeof Twilio> | null = null;

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');

    if (sid && token) {
      this.twilioClient = Twilio(sid, token);
      this.logger.log('Twilio SMS client initialised');
    } else {
      this.logger.warn(
        'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — SMS delivery disabled',
      );
    }
  }

  /* ── Email ─────────────────────────────────────────────────────────────── */

  async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, unknown>;
    userId?: string;
  }) {
    const client = this.supabase.getClient();
    const message = this.renderTemplate(data.template, data.variables);

    // Persist notification record first — delivery is best-effort
    await client.from('notifications').insert([
      {
        user_id: data.userId ?? null,
        type: 'email',
        title: data.subject,
        message,
        is_read: false,
      },
    ]);

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set — email to ${data.to} stored but not delivered`,
      );
      return { success: true, queued: true };
    }

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

  /* ── SMS ───────────────────────────────────────────────────────────────── */

  async sendSms(data: { to: string; message: string; userId?: string }) {
    // Persist to notifications table regardless of delivery outcome
    await this.supabase.getClient().from('notifications').insert([
      {
        user_id: data.userId ?? null,
        type: 'sms',
        title: 'SMS Notification',
        message: data.message,
        is_read: false,
      },
    ]);

    if (!this.twilioClient) {
      this.logger.warn(
        `Twilio not configured — SMS to ${data.to} stored but not delivered`,
      );
      return { success: true, queued: true };
    }

    const from = this.config.get<string>('TWILIO_FROM_NUMBER');
    if (!from) {
      this.logger.warn('TWILIO_FROM_NUMBER not set — SMS delivery skipped');
      return { success: true, queued: true };
    }

    try {
      const msg = await this.twilioClient.messages.create({
        to: data.to,
        from,
        body: data.message,
      });

      this.logger.log(`SMS delivered via Twilio: SID ${msg.sid} → ${data.to}`);
      return { success: true, sid: msg.sid };
    } catch (err) {
      const errMsg = (err as Error).message;
      this.logger.error(`Twilio SMS failed for ${data.to}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /* ── List ──────────────────────────────────────────────────────────────── */

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

  /* ── Helpers ───────────────────────────────────────────────────────────── */

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
