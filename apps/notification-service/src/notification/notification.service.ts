import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';
import Twilio from 'twilio';
import * as webPush from 'web-push';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private twilioClient: ReturnType<typeof Twilio> | null = null;
  private vapidConfigured = false;

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    // ── Twilio ─────────────────────────────────────────────────────────────
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

    // ── Web Push / VAPID ───────────────────────────────────────────────────
    const vapidPublic = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = this.config.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.config.get<string>(
      'VAPID_SUBJECT',
      'mailto:noreply@velluma.com',
    );
    if (vapidPublic && vapidPrivate) {
      webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      this.vapidConfigured = true;
      this.logger.log('Web Push VAPID keys loaded');
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push delivery disabled',
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
        delivery_status: 'pending',
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
    await this.supabase
      .getClient()
      .from('notifications')
      .insert([
        {
          user_id: data.userId ?? null,
          type: 'sms',
          title: 'SMS Notification',
          message: data.message,
          delivery_status: 'pending',
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

  /* ── Push ──────────────────────────────────────────────────────────────── */

  async savePushSubscription(data: {
    userId: string;
    tenantId?: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    const { error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .upsert(
        {
          user_id: data.userId,
          tenant_id: data.tenantId ?? data.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: 'user_id,endpoint' },
      );

    if (error) throw error;
    this.logger.log(`Push subscription saved for user ${data.userId}`);
    return { success: true };
  }

  async deletePushSubscription(data: { userId: string; endpoint: string }) {
    const { error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .delete()
      .eq('user_id', data.userId)
      .eq('endpoint', data.endpoint);

    if (error) throw error;
    this.logger.log(`Push subscription removed for user ${data.userId}`);
    return { success: true };
  }

  async sendPush(data: {
    userId: string;
    title: string;
    body: string;
    url?: string;
    notificationData?: Record<string, unknown>;
  }) {
    // Persist an in-app record regardless of push delivery outcome
    await this.supabase
      .getClient()
      .from('notifications')
      .insert([
        {
          user_id: data.userId,
          tenant_id: data.userId,
          type: 'push',
          title: data.title,
          message: data.body,
          data: data.notificationData ?? null,
          delivery_status: 'pending',
        },
      ]);

    if (!this.vapidConfigured) {
      this.logger.warn(
        'VAPID keys not configured — push notification stored but not delivered',
      );
      return { success: false, reason: 'vapid_not_configured' };
    }

    const { data: subscriptions, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', data.userId);

    if (error) throw error;
    if (!subscriptions?.length) return { success: true, delivered: 0 };

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      url: data.url ?? '/dashboard',
      data: data.notificationData,
    });

    const staleIds: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Browser unsubscribed — mark for cleanup
            staleIds.push(sub.id as string);
          }
          throw err;
        }
      }),
    );

    // Clean up expired subscriptions
    if (staleIds.length) {
      await this.supabase
        .getClient()
        .from('push_subscriptions')
        .delete()
        .in('id', staleIds);
      this.logger.log(
        `Removed ${staleIds.length} stale push subscription(s) for user ${data.userId}`,
      );
    }

    const delivered = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(
      `Push sent to user ${data.userId}: ${delivered}/${subscriptions.length} delivered`,
    );
    return { success: true, delivered, total: subscriptions.length };
  }

  /* ── List / Mark read ──────────────────────────────────────────────────── */

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

  async listUserNotifications(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('notifications')
      .select(
        'id, type, title, message, data, read_at, created_at, related_resource_type, related_resource_id',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) throw error;
    return data ?? [];
  }

  async markNotificationRead(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    const { error } = await this.supabase
      .getClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return { success: true };
  }

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return Object.entries(variables).reduce((text, [key, value]) => {
      let stringified: string;
      if (value == null) {
        stringified = '';
      } else if (typeof value === 'object') {
        stringified = JSON.stringify(value);
      } else if (typeof value === 'string') {
        stringified = value;
      } else if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      ) {
        stringified = value.toString();
      } else {
        stringified = '';
      }
      return text.replace(new RegExp(`{{${key}}}`, 'g'), stringified);
    }, template);
  }
}
