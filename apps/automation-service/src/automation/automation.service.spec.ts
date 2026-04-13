import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from 'supabase-lib';
import { AutomationService } from './automation.service';

// ──────────────────────────────────────────────────────────────────────────────
// Supabase chain mock
// ──────────────────────────────────────────────────────────────────────────────

function makeChain() {
  const c: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit'].forEach(
    (m) => (c[m] = jest.fn().mockReturnValue(c)),
  );
  c.single = jest.fn().mockResolvedValue({ data: null, error: null });
  return c;
}

function makeSupabaseMock() {
  const chain = makeChain();
  return {
    service: {
      getClient: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(chain) }),
    },
    chain,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('AutomationService', () => {
  let service: AutomationService;
  let mock: ReturnType<typeof makeSupabaseMock>;

  beforeEach(async () => {
    mock = makeSupabaseMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: SupabaseService, useValue: mock.service },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  });

  // ── createRule ────────────────────────────────────────────────────────────

  describe('createRule()', () => {
    const input = {
      tenantId: 'tenant-1',
      trigger: 'milestone_completed',
      action: 'send_invoice',
      name: 'Auto-invoice on milestone',
      conditions: { delay: 0 },
    };

    it('inserts a rule and returns it', async () => {
      const expected = { id: 'rule-1', ...input, is_active: true };
      mock.chain.single.mockResolvedValueOnce({ data: expected, error: null });

      const result = await service.createRule(input);

      expect(result).toEqual(expected);
      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tenant_id: 'tenant-1',
            trigger: 'milestone_completed',
            action: 'send_invoice',
            is_active: true,
          }),
        ]),
      );
    });

    it('defaults name to "Untitled Rule" when not provided', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'rule-1', name: 'Untitled Rule' },
        error: null,
      });

      await service.createRule({ tenantId: 't', trigger: 'x', action: 'y' });

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Untitled Rule' }),
        ]),
      );
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' },
      });

      await expect(service.createRule(input)).rejects.toThrow(
        'Failed to create automation rule',
      );
    });
  });

  // ── listRules ─────────────────────────────────────────────────────────────

  describe('listRules()', () => {
    it('returns active rules for the tenant', async () => {
      const rules = [
        { id: 'rule-1', trigger: 'milestone_completed', is_active: true },
        { id: 'rule-2', trigger: 'payment_overdue', is_active: true },
      ];
      // listRules terminates with .order()
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: rules, error: null });

      const result = await service.listRules('tenant-1');

      expect(result).toEqual(rules);
      expect(mock.chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
      expect(mock.chain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(service.listRules('tenant-1')).rejects.toMatchObject({
        message: 'DB error',
      });
    });
  });

  // ── triggerEvent ──────────────────────────────────────────────────────────

  describe('triggerEvent()', () => {
    const input = {
      tenantId: 'tenant-1',
      event: 'milestone_completed',
      payload: { milestoneId: 'ms-1' },
    };

    it('returns processedEvents equal to the number of matching rules', async () => {
      const matchingRules = [
        { id: 'rule-1', trigger: 'milestone_completed' },
        { id: 'rule-2', trigger: 'milestone_completed' },
      ];
      // triggerEvent uses .eq() chain without single() — terminal is the chain itself
      mock.chain.eq = jest.fn().mockReturnValue({
        ...mock.chain,
        // final .eq() resolves with data
        then: undefined,
      });

      // Since the service awaits `from(...).select(...).eq(...).eq(...).eq(...)`,
      // we need to make the last `.eq()` resolve.
      // Rebuild chain so the last call resolves:
      const innerChain: any = {};
      ['select', 'eq'].forEach((m) => {
        innerChain[m] = jest.fn().mockReturnValue(innerChain);
      });
      // The final call to the chain (after all .eq()) returns a promise
      innerChain.eq
        .mockReturnValueOnce(innerChain) // .eq('tenant_id', ...)
        .mockReturnValueOnce(innerChain) // .eq('trigger', ...)
        .mockResolvedValueOnce({ data: matchingRules, error: null }); // .eq('is_active', true)

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(innerChain),
      });

      const result = await service.triggerEvent(input);

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(2);
    });

    it('returns processedEvents:0 and success:false when Supabase errors', async () => {
      const errChain: any = {};
      ['select', 'eq'].forEach((m) => {
        errChain[m] = jest.fn().mockReturnValue(errChain);
      });
      errChain.eq
        .mockReturnValueOnce(errChain)
        .mockReturnValueOnce(errChain)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(errChain),
      });

      const result = await service.triggerEvent(input);

      expect(result.success).toBe(false);
      expect(result.processedEvents).toBe(0);
    });

    it('returns processedEvents:0 when no rules match the event', async () => {
      const noMatchChain: any = {};
      ['select', 'eq'].forEach((m) => {
        noMatchChain[m] = jest.fn().mockReturnValue(noMatchChain);
      });
      noMatchChain.eq
        .mockReturnValueOnce(noMatchChain)
        .mockReturnValueOnce(noMatchChain)
        .mockResolvedValueOnce({ data: [], error: null });

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(noMatchChain),
      });

      const result = await service.triggerEvent(input);

      expect(result.success).toBe(true);
      expect(result.processedEvents).toBe(0);
    });
  });
});
