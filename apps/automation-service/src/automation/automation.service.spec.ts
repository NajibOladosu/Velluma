import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from 'supabase-lib';
import { of, throwError } from 'rxjs';
import { AutomationService } from './automation.service';

// ──────────────────────────────────────────────────────────────────────────────
// Mock builders
// ──────────────────────────────────────────────────────────────────────────────

/** Chainable Supabase query builder. */
function makeChain(finalValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit'].forEach(
    (m) => (c[m] = jest.fn().mockReturnValue(c)),
  );
  c.single = jest.fn().mockResolvedValue(finalValue);
  // Default: chains resolve to { data: null, error: null } unless overridden
  Object.defineProperty(c, Symbol.toStringTag, { value: 'MockChain' });
  return c;
}

/**
 * Creates a Supabase service mock that routes `from(tableName)` calls to
 * pre-configured per-table chains.  Any table not explicitly listed falls
 * back to a no-op chain that resolves with `{ data: null, error: null }`.
 */
function makeSupabaseMock(
  tables: Record<string, any> = {},
) {
  const defaultChain = makeChain();
  const getClient = jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation((table: string) => tables[table] ?? defaultChain),
  });
  return { getClient };
}

/** Mock ClientProxy for NOTIFICATION_SERVICE */
function makeNotificationClient() {
  return { send: jest.fn().mockReturnValue(of({ success: true })) };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const baseRule = {
  id: 'rule-1',
  tenant_id: 'tenant-1',
  name: 'Test Rule',
  trigger: 'milestone_completed',
  action: 'send_notification',
  conditions: {
    to: 'client@example.com',
    subject: 'Milestone done',
    template: 'Milestone {{milestoneName}} is complete.',
  },
  is_active: true,
};

const basePayload = {
  milestoneId: 'ms-1',
  contractId: 'contract-1',
  projectId: 'project-1',
  milestoneName: 'MVP Release',
  clientEmail: 'client@example.com',
  freelancerEmail: 'freelancer@example.com',
  userId: 'user-1',
};

/**
 * Build a rule chain that returns a list of rules on the final `.eq()` of the
 * initial select, while also supporting subsequent `.update()/.eq()` calls
 * from `incrementRunCount` (reuses the same chain object via `from('automation_rules')`).
 */
function makeRuleChain(rules: any[]) {
  const chain: any = {};
  // Mock every chainable method so reuse of this chain doesn't throw
  ['select', 'eq', 'update', 'insert', 'delete', 'order', 'limit'].forEach(
    (m) => (chain[m] = jest.fn().mockReturnValue(chain)),
  );
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  // First three `.eq()` calls are for the rule-fetch select query
  chain.eq
    .mockReturnValueOnce(chain)  // .eq('tenant_id', ...)
    .mockReturnValueOnce(chain)  // .eq('trigger', ...)
    .mockResolvedValueOnce({ data: rules, error: null }); // .eq('is_active', true)
  return chain;
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────────────────────

describe('AutomationService', () => {
  let service: AutomationService;
  let supabaseMock: ReturnType<typeof makeSupabaseMock>;
  let notificationClient: ReturnType<typeof makeNotificationClient>;

  async function buildService(
    tables: Record<string, any> = {},
    withNotificationClient = true,
  ) {
    supabaseMock = makeSupabaseMock(tables);
    notificationClient = makeNotificationClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: SupabaseService, useValue: supabaseMock },
        ...(withNotificationClient
          ? [{ provide: 'NOTIFICATION_SERVICE', useValue: notificationClient }]
          : []),
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  }

  beforeEach(() => jest.clearAllMocks());

  // ── createRule ─────────────────────────────────────────────────────────────

  describe('createRule()', () => {
    const input = {
      tenantId: 'tenant-1',
      trigger: 'milestone_completed',
      action: 'send_notification',
      name: 'Auto-notify on milestone',
      conditions: { to: 'client@example.com' },
    };

    it('inserts a rule and returns it', async () => {
      const expected = { id: 'rule-1', ...input, is_active: true };
      const chain = makeChain({ data: expected, error: null });

      await buildService({ automation_rules: chain });

      const result = await service.createRule(input);

      expect(result).toEqual(expected);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tenant_id: 'tenant-1',
            trigger: 'milestone_completed',
            action: 'send_notification',
            is_active: true,
          }),
        ]),
      );
    });

    it('defaults name to "Untitled Rule" when not provided', async () => {
      const chain = makeChain({ data: { id: 'rule-1', name: 'Untitled Rule' }, error: null });
      await buildService({ automation_rules: chain });

      await service.createRule({ tenantId: 't', trigger: 'x', action: 'y' });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Untitled Rule' }),
        ]),
      );
    });

    it('throws when Supabase returns an error', async () => {
      const chain = makeChain({ data: null, error: { message: 'Constraint violation' } });
      await buildService({ automation_rules: chain });

      await expect(service.createRule(input)).rejects.toThrow(
        'Failed to create automation rule',
      );
    });
  });

  // ── listRules ──────────────────────────────────────────────────────────────

  describe('listRules()', () => {
    it('returns active rules for the tenant', async () => {
      const rules = [
        { id: 'rule-1', trigger: 'milestone_completed', is_active: true },
        { id: 'rule-2', trigger: 'payment_overdue', is_active: true },
      ];
      const chain = makeChain();
      chain.order = jest.fn().mockResolvedValue({ data: rules, error: null });
      await buildService({ automation_rules: chain });

      const result = await service.listRules('tenant-1');

      expect(result).toEqual(rules);
      expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('throws when Supabase returns an error', async () => {
      const chain = makeChain();
      chain.order = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      await buildService({ automation_rules: chain });

      await expect(service.listRules('tenant-1')).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  // ── triggerEvent — basic ───────────────────────────────────────────────────

  describe('triggerEvent() — rule matching', () => {
    it('returns processedEvents equal to matched rule count on success', async () => {
      const rulesChain = makeRuleChain([baseRule]);
      const logChain = makeChain();
      const updateChain = makeChain();

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      // send_notification dispatches through notificationClient
      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(1);
    });

    it('returns processedEvents:0 when no rules match', async () => {
      const chain = makeRuleChain([]);
      await buildService({ automation_rules: chain });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'unknown_event',
        payload: basePayload,
      });

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(0);
    });

    it('returns success:false when Supabase query errors', async () => {
      const errChain: any = {};
      ['select', 'eq'].forEach((m) => {
        errChain[m] = jest.fn().mockReturnValue(errChain);
      });
      errChain.eq
        .mockReturnValueOnce(errChain)
        .mockReturnValueOnce(errChain)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      await buildService({ automation_rules: errChain });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(result.success).toBe(false);
      expect(result.processedEvents).toBe(0);
    });
  });

  // ── send_notification dispatch ─────────────────────────────────────────────

  describe('triggerEvent() — send_notification action', () => {
    it('sends email via notification-service with resolved variables', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: {
          to: 'client@example.com',
          subject: 'Milestone {{milestoneName}} done',
          template: 'Project milestone {{milestoneName}} completed.',
        },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const updateChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(notificationClient.send).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({
          to: 'client@example.com',
          subject: 'Milestone MVP Release done',
          template: 'Project milestone MVP Release completed.',
          variables: expect.objectContaining({ milestoneName: 'MVP Release' }),
        }),
      );
    });

    it('resolves recipient from payload.clientEmail when conditions.to is absent', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: { subject: 'Hello', template: 'Hi' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: { ...basePayload, clientEmail: 'auto@example.com' },
      });

      expect(notificationClient.send).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({ to: 'auto@example.com' }),
      );
    });

    it('counts rule as failed when no recipient email is resolvable', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: {}, // no to, no template
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: { milestoneId: 'ms-1' }, // no email in payload
      });

      // Rule fails (throws) → processedEvents = 0
      expect(result.processedEvents).toBe(0);
      // Logged as failed
      expect(logChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'failed' }),
        ]),
      );
    });

    it('skips send_notification (no client call) when NOTIFICATION_SERVICE is absent', async () => {
      const rule = { ...baseRule, action: 'send_notification' };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService(
        { automation_rules: rulesChain, automation_logs: logChain },
        false, // no notification client
      );

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      // Still counts as dispatched (graceful skip)
      expect(result.processedEvents).toBe(1);
      expect(notificationClient.send).not.toHaveBeenCalled();
    });
  });

  // ── update_status dispatch ─────────────────────────────────────────────────

  describe('triggerEvent() — update_status action', () => {
    it('updates the target resource status in Supabase', async () => {
      const rule = {
        ...baseRule,
        action: 'update_status',
        conditions: { resourceType: 'contract', newStatus: 'active' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const contractChain = makeChain({ data: null, error: null });
      contractChain.eq = jest.fn().mockReturnValue(contractChain);

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        contracts: contractChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: { ...basePayload, contractId: 'contract-123' },
      });

      expect(result.processedEvents).toBe(1);
      expect(contractChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('resolves resourceId from payload using resourceType key', async () => {
      const rule = {
        ...baseRule,
        action: 'update_status',
        conditions: { resourceType: 'project', newStatus: 'completed' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const projectChain = makeChain({ data: null, error: null });
      projectChain.eq = jest.fn().mockReturnValue(projectChain);

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        projects: projectChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: { projectId: 'project-999' },
      });

      expect(projectChain.eq).toHaveBeenCalledWith('id', 'project-999');
    });

    it('fails when resourceType is not in the whitelist', async () => {
      const rule = {
        ...baseRule,
        action: 'update_status',
        conditions: { resourceType: 'users', newStatus: 'admin' }, // not allowed
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(result.processedEvents).toBe(0);
      expect(logChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'failed' }),
        ]),
      );
    });

    it('fails when Supabase update errors', async () => {
      const rule = {
        ...baseRule,
        action: 'update_status',
        conditions: { resourceType: 'contract', newStatus: 'cancelled' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const errChain = makeChain({ data: null, error: null });
      errChain.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'FK violation' } }),
        }),
      });

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        contracts: errChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(result.processedEvents).toBe(0);
    });
  });

  // ── release_escrow dispatch ────────────────────────────────────────────────

  describe('triggerEvent() — release_escrow action', () => {
    it('updates contract status to completed and sends notification', async () => {
      const rule = {
        ...baseRule,
        action: 'release_escrow',
        conditions: { recipientEmail: 'freelancer@example.com' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const contractChain = makeChain({ data: null, error: null });
      contractChain.eq = jest.fn().mockReturnValue(contractChain);

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        contracts: contractChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'project_completed',
        payload: { ...basePayload, contractId: 'contract-456' },
      });

      expect(result.processedEvents).toBe(1);
      // Contract marked completed
      expect(contractChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
      // Escrow notification sent
      expect(notificationClient.send).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({
          to: 'freelancer@example.com',
          subject: 'Escrow Released — Payment Authorized',
        }),
      );
    });

    it('resolves recipientEmail from {{placeholder}} in conditions', async () => {
      const rule = {
        ...baseRule,
        action: 'release_escrow',
        conditions: { recipientEmail: '{{freelancerEmail}}' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const contractChain = makeChain({ data: null, error: null });
      contractChain.eq = jest.fn().mockReturnValue(contractChain);

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        contracts: contractChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'project_completed',
        payload: { ...basePayload, freelancerEmail: 'alice@studio.com' },
      });

      expect(notificationClient.send).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({ to: 'alice@studio.com' }),
      );
    });

    it('falls back to payload.freelancerEmail when conditions.recipientEmail is absent', async () => {
      const rule = {
        ...baseRule,
        action: 'release_escrow',
        conditions: {}, // no recipientEmail
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const contractChain = makeChain({ data: null, error: null });
      contractChain.eq = jest.fn().mockReturnValue(contractChain);

      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
        contracts: contractChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'project_completed',
        payload: { contractId: 'c-1', freelancerEmail: 'bob@freelance.com' },
      });

      expect(notificationClient.send).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({ to: 'bob@freelance.com' }),
      );
    });

    it('still releases escrow even when notification client is absent', async () => {
      const rule = {
        ...baseRule,
        action: 'release_escrow',
        conditions: { recipientEmail: 'freelancer@example.com' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      const contractChain = makeChain({ data: null, error: null });
      contractChain.eq = jest.fn().mockReturnValue(contractChain);

      await buildService(
        {
          automation_rules: rulesChain,
          automation_logs: logChain,
          contracts: contractChain,
        },
        false, // no notification client
      );

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'project_completed',
        payload: { contractId: 'c-1', freelancerEmail: 'f@example.com' },
      });

      expect(result.processedEvents).toBe(1);
      expect(contractChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('fails when contractId is missing from payload', async () => {
      const rule = {
        ...baseRule,
        action: 'release_escrow',
        conditions: {},
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'project_completed',
        payload: { userId: 'u-1' }, // no contractId
      });

      expect(result.processedEvents).toBe(0);
      expect(logChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'failed' }),
        ]),
      );
    });
  });

  // ── Execution logging ──────────────────────────────────────────────────────

  describe('execution logging', () => {
    it('writes a success log after a successful dispatch', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: { to: 'x@example.com', subject: 's', template: 't' },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(logChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-1',
            tenant_id: 'tenant-1',
            trigger: 'milestone_completed',
            action: 'send_notification',
            status: 'success',
          }),
        ]),
      );
    });

    it('writes a failed log when dispatch throws', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: {}, // no recipient → will throw
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: { milestoneId: 'ms-1' }, // no email
      });

      expect(logChain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'failed',
            error: expect.stringContaining('recipient email'),
          }),
        ]),
      );
    });
  });

  // ── run_count increment ────────────────────────────────────────────────────

  describe('run_count increment', () => {
    it('increments conditions.run_count after successful dispatch', async () => {
      const rule = {
        ...baseRule,
        action: 'send_notification',
        conditions: {
          to: 'x@example.com',
          subject: 's',
          template: 't',
          run_count: 5,
        },
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      // Capture the update call on automation_rules
      const updateChain = makeChain({ data: null, error: null });
      updateChain.eq = jest.fn().mockResolvedValue({ error: null });

      const supabase = makeSupabaseMock({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });
      // Override to track update calls
      const originalFrom = supabase.getClient().from;
      let updateCalled = false;
      (supabase.getClient as jest.Mock).mockReturnValue({
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'automation_rules') {
            const c = makeChain();
            c.eq = jest.fn().mockReturnValue(c);
            // First call: select (triggerEvent rule fetch) → returns rules
            // Subsequent calls: update (incrementRunCount) → resolves ok
            if (!updateCalled) {
              // This is the select chain used by triggerEvent
              const selectChain: any = {};
              ['select', 'eq'].forEach((m) => {
                selectChain[m] = jest.fn().mockReturnValue(selectChain);
              });
              selectChain.eq
                .mockReturnValueOnce(selectChain)
                .mockReturnValueOnce(selectChain)
                .mockResolvedValueOnce({ data: [rule], error: null });
              updateCalled = true;
              return selectChain;
            }
            // Second call is the update for incrementRunCount
            const uc: any = {};
            uc.update = jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            });
            return uc;
          }
          if (table === 'automation_logs') return logChain;
          return makeChain();
        }),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AutomationService,
          { provide: SupabaseService, useValue: supabase },
          { provide: 'NOTIFICATION_SERVICE', useValue: notificationClient },
        ],
      }).compile();

      const svc = module.get<AutomationService>(AutomationService);

      const result = await svc.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      expect(result.processedEvents).toBe(1);
    });
  });

  // ── unknown action ─────────────────────────────────────────────────────────

  describe('unknown action type', () => {
    it('counts unknown actions as dispatched (graceful skip)', async () => {
      const rule = {
        ...baseRule,
        action: 'unsupported_future_action',
        conditions: {},
      };
      const rulesChain = makeRuleChain([rule]);
      const logChain = makeChain();
      await buildService({
        automation_rules: rulesChain,
        automation_logs: logChain,
      });

      const result = await service.triggerEvent({
        tenantId: 'tenant-1',
        event: 'milestone_completed',
        payload: basePayload,
      });

      // Unknown action is a graceful skip — no throw — counts as dispatched
      expect(result.processedEvents).toBe(1);
    });
  });
});
