import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SupabaseService } from 'supabase-lib';

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */

interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger: string;
  action: string;
  conditions: Record<string, unknown>;
  is_active: boolean;
}

/** Shape of the event payload emitted by domain services. */
export interface EventPayload {
  contractId?: string;
  projectId?: string;
  invoiceId?: string;
  milestoneId?: string;
  clientEmail?: string;
  freelancerEmail?: string;
  clientName?: string;
  freelancerName?: string;
  projectName?: string;
  milestoneName?: string;
  amount?: number;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Resource types that the `update_status` action is allowed to mutate.
 * Whitelist prevents arbitrary table writes.
 */
const ALLOWED_RESOURCE_TABLES: Record<string, string> = {
  contract: 'contracts',
  project: 'projects',
  invoice: 'invoices',
  milestone: 'milestones',
};

/* ────────────────────────────────────────────────────────────────────────────
   Service
   ──────────────────────────────────────────────────────────────────────────── */

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private supabase: SupabaseService,
    /**
     * Optional: notification-service Redis client.
     * When absent (e.g., in isolated unit tests), send_notification actions
     * are skipped with a warning rather than crashing the service.
     */
    @Optional()
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy | null,
  ) {}

  /* ── Rule management ────────────────────────────────────────────────────── */

  async createRule(data: {
    tenantId: string;
    trigger: string;
    action: string;
    conditions?: Record<string, unknown>;
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

  /* ── Event dispatcher ───────────────────────────────────────────────────── */

  async triggerEvent(data: {
    tenantId: string;
    event: string;
    payload: EventPayload;
  }): Promise<{ success: boolean; processedEvents: number }> {
    this.logger.log(
      `Event triggered: "${data.event}" for tenant ${data.tenantId}`,
    );

    // 1. Fetch active rules whose trigger matches this event
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

    if (!rules || rules.length === 0) {
      return { success: true, processedEvents: 0 };
    }

    this.logger.log(
      `Dispatching ${rules.length} rule(s) for trigger "${data.event}"`,
    );

    // 2. Dispatch each rule's action — failures are isolated
    let dispatched = 0;

    for (const rule of rules as AutomationRule[]) {
      try {
        await this.dispatchAction(rule, data.payload);
        await this.logExecution(rule, data.event, data.payload, 'success');
        await this.incrementRunCount(rule);
        dispatched++;
        this.logger.log(
          `Rule "${rule.name}" (${rule.action}) dispatched successfully`,
        );
      } catch (err) {
        const message = (err as Error).message;
        this.logger.warn(
          `Rule "${rule.name}" (${rule.action}) failed: ${message}`,
        );
        await this.logExecution(rule, data.event, data.payload, 'failed', message);
      }
    }

    return { success: true, processedEvents: dispatched };
  }

  /* ── Action dispatch ────────────────────────────────────────────────────── */

  private async dispatchAction(
    rule: AutomationRule,
    payload: EventPayload,
  ): Promise<void> {
    const conditions = rule.conditions ?? {};

    switch (rule.action) {
      case 'send_notification':
        return this.dispatchSendNotification(rule, payload, conditions);
      case 'update_status':
        return this.dispatchUpdateStatus(rule, payload, conditions);
      case 'release_escrow':
        return this.dispatchReleaseEscrow(rule, payload, conditions);
      default:
        this.logger.warn(
          `Unknown action type "${rule.action}" for rule "${rule.name}" — skipped`,
        );
    }
  }

  /**
   * send_notification — delegates to notification-service via Redis.
   *
   * Required condition fields:
   *   to       {string} Recipient email. Supports {{placeholder}} from payload.
   *
   * Optional condition fields:
   *   subject  {string} Email subject. Defaults to rule name.
   *   template {string} Message body with {{placeholder}} support.
   */
  private async dispatchSendNotification(
    rule: AutomationRule,
    payload: EventPayload,
    conditions: Record<string, unknown>,
  ): Promise<void> {
    if (!this.notificationClient) {
      this.logger.warn(
        `NOTIFICATION_SERVICE unavailable — skipping send_notification for rule "${rule.name}"`,
      );
      return;
    }

    // Resolve recipient: conditions.to takes precedence, then event payload
    const rawTo =
      (conditions.to as string | undefined) ??
      payload.clientEmail ??
      payload.freelancerEmail;

    if (!rawTo) {
      throw new Error(
        `Rule "${rule.name}": send_notification requires a recipient email in conditions.to or event payload`,
      );
    }

    const to = this.resolveVariable(rawTo, payload);
    const subject = this.resolveVariable(
      (conditions.subject as string | undefined) ?? rule.name,
      payload,
    );
    const template = this.resolveVariable(
      (conditions.template as string | undefined) ?? rule.name,
      payload,
    );

    await this.sendViaClient('send_email', {
      to,
      subject,
      template,
      variables: { ...payload },
      userId: String(payload.userId ?? ''),
    });
  }

  /**
   * update_status — writes a new status directly to the target resource row.
   *
   * Required condition fields:
   *   resourceType  {string} One of: contract, project, invoice, milestone.
   *   newStatus     {string} The target status value.
   *
   * The resource ID is resolved from the event payload
   * as `payload.{resourceType}Id` (e.g., payload.contractId).
   */
  private async dispatchUpdateStatus(
    rule: AutomationRule,
    payload: EventPayload,
    conditions: Record<string, unknown>,
  ): Promise<void> {
    const resourceType = conditions.resourceType as string | undefined;
    const newStatus = conditions.newStatus as string | undefined;

    if (!resourceType || !newStatus) {
      throw new Error(
        `Rule "${rule.name}": update_status requires conditions.resourceType and conditions.newStatus`,
      );
    }

    const tableName = ALLOWED_RESOURCE_TABLES[resourceType];
    if (!tableName) {
      throw new Error(
        `Rule "${rule.name}": unknown resourceType "${resourceType}". ` +
          `Allowed: ${Object.keys(ALLOWED_RESOURCE_TABLES).join(', ')}`,
      );
    }

    // Resolve resource ID from payload (e.g. contractId, projectId)
    const resourceId =
      (payload[`${resourceType}Id`] as string | undefined) ??
      (payload.resourceId as string | undefined);

    if (!resourceId) {
      throw new Error(
        `Rule "${rule.name}": update_status could not find ${resourceType}Id in event payload`,
      );
    }

    const { error } = await this.supabase
      .getClient()
      .from(tableName)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', resourceId)
      .eq('tenant_id', rule.tenant_id);

    if (error) {
      throw new Error(
        `Rule "${rule.name}": status update on ${tableName} failed — ${error.message}`,
      );
    }
  }

  /**
   * release_escrow — marks the contract as completed and notifies the recipient.
   *
   * The contract status change signals downstream payment processors (Stripe)
   * that funds can be released to the freelancer.
   *
   * Required event payload fields:
   *   contractId  {string}
   *
   * Optional condition fields:
   *   recipientEmail  {string} Freelancer email. Falls back to payload.freelancerEmail.
   */
  private async dispatchReleaseEscrow(
    rule: AutomationRule,
    payload: EventPayload,
    conditions: Record<string, unknown>,
  ): Promise<void> {
    const contractId = payload.contractId;
    if (!contractId) {
      throw new Error(
        `Rule "${rule.name}": release_escrow requires contractId in event payload`,
      );
    }

    // 1. Update contract status to 'completed' to signal escrow release
    const { error } = await this.supabase
      .getClient()
      .from('contracts')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', contractId)
      .eq('tenant_id', rule.tenant_id);

    if (error) {
      throw new Error(
        `Rule "${rule.name}": contract status update failed — ${error.message}`,
      );
    }

    // 2. Notify the recipient (best-effort — escrow release already recorded above)
    if (!this.notificationClient) return;

    const rawEmail =
      (conditions.recipientEmail as string | undefined) ??
      payload.freelancerEmail;

    if (!rawEmail) {
      this.logger.warn(
        `Rule "${rule.name}": release_escrow has no recipient email — notification skipped`,
      );
      return;
    }

    const recipientEmail = this.resolveVariable(rawEmail, payload);

    try {
      await this.sendViaClient('send_email', {
        to: recipientEmail,
        subject: 'Escrow Released — Payment Authorized',
        template:
          'Your escrow payment has been released for contract {{contractId}}. Funds will be transferred to your account within 1-3 business days.',
        variables: {
          contractId,
          recipientEmail,
          ...payload,
        },
        userId: String(payload.userId ?? ''),
      });
    } catch (err) {
      // Notification failure is non-fatal — the escrow status is already updated
      this.logger.warn(
        `Rule "${rule.name}": escrow released but notification failed — ${(err as Error).message}`,
      );
    }
  }

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  /**
   * Wraps `ClientProxy.send()` in a plain Promise.
   * Avoids `firstValueFrom` which conflicts with the monorepo's dual rxjs versions.
   */
  private sendViaClient(pattern: string, data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      (this.notificationClient as ClientProxy)
        .send(pattern, data)
        .subscribe({
          next: (result: unknown) => resolve(result),
          error: (err: Error) => reject(err),
        });
    });
  }

  /** Resolve {{placeholder}} tokens in a string from the event payload. */
  private resolveVariable(
    template: string,
    payload: Record<string, unknown>,
  ): string {
    return Object.entries(payload).reduce(
      (text, [key, value]) =>
        text.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? '')),
      template,
    );
  }

  /**
   * Increment the `run_count` stored inside `automation_rules.conditions`.
   * Fully best-effort — any error is swallowed so it never blocks the dispatch.
   */
  private async incrementRunCount(rule: AutomationRule): Promise<void> {
    try {
      const prev = Number((rule.conditions as any)?.run_count ?? 0);
      const { error } = await this.supabase
        .getClient()
        .from('automation_rules')
        .update({
          conditions: { ...rule.conditions, run_count: prev + 1 },
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id);

      if (error) {
        this.logger.warn(
          `Could not increment run_count for rule ${rule.id}: ${error.message}`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `Could not increment run_count for rule ${rule.id}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Write an execution record to automation_logs.
   * Best-effort — failures are swallowed so they never block the dispatch result.
   */
  private async logExecution(
    rule: AutomationRule,
    trigger: string,
    payload: EventPayload,
    status: 'success' | 'failed' | 'skipped',
    errorMessage?: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('automation_logs')
      .insert([
        {
          rule_id: rule.id,
          tenant_id: rule.tenant_id,
          trigger,
          action: rule.action,
          status,
          payload,
          error: errorMessage ?? null,
        },
      ]);

    if (error) {
      // Non-fatal: log the failure but don't propagate it
      this.logger.warn(
        `Could not write automation log for rule ${rule.id}: ${error.message}`,
      );
    }
  }
}
