import { Test, TestingModule } from '@nestjs/testing';
import { BudgetService } from './budget.service';
import { SupabaseService } from 'supabase-lib';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Build a chainable Supabase query mock that resolves with the given data.
 *
 * The chain itself is a Promise (thenable) so that both:
 *   - `await chain.eq(...).neq(...)` and
 *   - `await chain.eq(...).single()`
 * resolve to `resolved`, regardless of where the caller terminates the chain.
 */
function makeChain(resolved: { data: unknown; error: unknown }) {
  const promise = Promise.resolve(resolved);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    then: (
      onFulfilled: Parameters<Promise<unknown>['then']>[0],
      onRejected: Parameters<Promise<unknown>['then']>[1],
    ) => promise.then(onFulfilled, onRejected),
    catch: (onRejected: Parameters<Promise<unknown>['catch']>[0]) =>
      promise.catch(onRejected),
    finally: (onFinally: Parameters<Promise<unknown>['finally']>[0]) =>
      promise.finally(onFinally),
  };

  ['select', 'eq', 'neq', 'in', 'single'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  return chain;
}

/** Create a mock Supabase client whose from() returns a chain per call. */
function makeSupabaseMock(
  callMap: Record<string, { data: unknown; error: unknown }>,
) {
  const fromMock = jest.fn((table: string) => makeChain(callMap[table]));
  return {
    getClient: jest.fn().mockReturnValue({ from: fromMock }),
    _from: fromMock, // expose for assertions
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tests
   ───────────────────────────────────────────────────────────────────────────── */

describe('BudgetService', () => {
  let service: BudgetService;

  // ---------------------------------------------------------------------------
  // 1. getProjectProfitability
  // ---------------------------------------------------------------------------

  describe('getProjectProfitability', () => {
    async function buildService(
      callMap: Record<string, { data: unknown; error: unknown }>,
    ) {
      const supabaseMock = makeSupabaseMock(callMap);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BudgetService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      return module.get<BudgetService>(BudgetService);
    }

    it('calculates revenue, expense cost, and labor cost correctly', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 10000, tenant_id: 't1' },
          error: null,
        },
        expenses: {
          data: [{ amount: 500 }, { amount: 200 }],
          error: null,
        },
        time_entries: {
          // 10 hours @ $80/hr = $800 labor
          data: [
            { duration_minutes: 360, hourly_rate: 80 }, // 6h @ $80
            { duration_minutes: 240, hourly_rate: 80 }, // 4h @ $80
          ],
          error: null,
        },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.totalBudget).toBe(10000);
      expect(result.expenseCost).toBe(700);
      expect(result.laborCost).toBe(800);
      expect(result.totalCost).toBe(1500);
      expect(result.profit).toBe(8500);
      expect(result.profitabilityPercent).toBe(85);
      expect(result.totalHoursLogged).toBe(10);
      expect(result.effectiveHourlyRate).toBe(1000); // $10,000 / 10h
    });

    it('returns zero labor cost when no time entries exist', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 5000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [{ amount: 200 }], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.laborCost).toBe(0);
      expect(result.totalHoursLogged).toBe(0);
      expect(result.effectiveHourlyRate).toBe(0);
      expect(result.expenseCost).toBe(200);
      expect(result.profit).toBe(4800);
    });

    it('returns zero expense cost when no expenses exist', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 4000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: {
          data: [{ duration_minutes: 120, hourly_rate: 100 }], // 2h @ $100 = $200
          error: null,
        },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.expenseCost).toBe(0);
      expect(result.laborCost).toBe(200);
      expect(result.profit).toBe(3800);
    });

    it('handles negative profit (over-budget)', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 1000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [{ amount: 800 }], error: null },
        time_entries: {
          data: [{ duration_minutes: 480, hourly_rate: 100 }], // 8h @ $100 = $800
          error: null,
        },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.profit).toBe(-600);
      expect(result.profitabilityPercent).toBe(-60);
    });

    it('handles null hourly_rate and duration_minutes gracefully', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 2000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: {
          data: [{ duration_minutes: null, hourly_rate: null }],
          error: null,
        },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.laborCost).toBe(0);
      expect(result.totalHoursLogged).toBe(0);
    });

    it('returns zero profitabilityPercent when revenue is zero', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 0, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getProjectProfitability('p1');

      expect(result.profitabilityPercent).toBe(0);
      expect(result.effectiveHourlyRate).toBe(0);
    });

    it('throws when project is not found', async () => {
      service = await buildService({
        projects: {
          data: null,
          error: { message: 'Row not found' },
        },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      await expect(service.getProjectProfitability('missing')).rejects.toThrow(
        'Project not found',
      );
    });

    it('throws when expenses query fails', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 1000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: null, error: { message: 'DB error' } },
        time_entries: { data: [], error: null },
      });

      await expect(service.getProjectProfitability('p1')).rejects.toThrow(
        'Failed to fetch expenses: DB error',
      );
    });

    it('throws when time_entries query fails', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 1000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: { data: null, error: { message: 'Time DB error' } },
      });

      await expect(service.getProjectProfitability('p1')).rejects.toThrow(
        'Failed to fetch time entries: Time DB error',
      );
    });

    it('sets projectId on the response', async () => {
      service = await buildService({
        projects: {
          data: { total_budget: 5000, tenant_id: 't1' },
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getProjectProfitability('proj-abc');
      expect(result.projectId).toBe('proj-abc');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. getTenantHealthScore
  // ---------------------------------------------------------------------------

  describe('getTenantHealthScore', () => {
    async function buildService(
      callMap: Record<string, { data: unknown; error: unknown }>,
    ) {
      const supabaseMock = makeSupabaseMock(callMap);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BudgetService,
          { provide: SupabaseService, useValue: supabaseMock },
        ],
      }).compile();
      return module.get<BudgetService>(BudgetService);
    }

    it('aggregates revenue, expenses, and labor for the tenant', async () => {
      service = await buildService({
        projects: {
          data: [{ total_budget: 8000 }, { total_budget: 4000 }],
          error: null,
        },
        expenses: {
          data: [{ amount: 300 }, { amount: 200 }],
          error: null,
        },
        time_entries: {
          // 5h @ $100 + 3h @ $80 = $500 + $240 = $740 labor, 8h total
          data: [
            { duration_minutes: 300, hourly_rate: 100 },
            { duration_minutes: 180, hourly_rate: 80 },
          ],
          error: null,
        },
      });

      const result = await service.getTenantHealthScore('t1');

      expect(result.totalRevenue).toBe(12000);
      expect(result.totalExpenses).toBe(500);
      expect(result.totalLaborCost).toBe(740);
      expect(result.totalCost).toBe(1240);
      expect(result.totalProfit).toBe(10760);
      expect(result.profitabilityPercent).toBe(90); // Math.round(10760/12000*100) = 90
      expect(result.totalHoursLogged).toBe(8);
      expect(result.projectCount).toBe(2);
    });

    it('averageEHR = totalRevenue / totalHours', async () => {
      service = await buildService({
        projects: {
          data: [{ total_budget: 6000 }],
          error: null,
        },
        expenses: { data: [], error: null },
        time_entries: {
          data: [{ duration_minutes: 600, hourly_rate: 0 }], // 10h
          error: null,
        },
      });

      const result = await service.getTenantHealthScore('t1');

      expect(result.totalHoursLogged).toBe(10);
      expect(result.averageEHR).toBe(600); // $6000 / 10h = $600/h
    });

    it('healthScore clamps to 0 when project is at a loss', async () => {
      service = await buildService({
        projects: { data: [{ total_budget: 500 }], error: null },
        expenses: { data: [{ amount: 1000 }], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getTenantHealthScore('t1');

      expect(result.totalProfit).toBe(-500);
      expect(result.profitabilityPercent).toBe(-100);
      expect(result.healthScore).toBe(0); // clamped at 0
    });

    it('healthScore clamps to 100 when profitability exceeds 100%', async () => {
      // Zero costs → profitability = 100%
      service = await buildService({
        projects: { data: [{ total_budget: 5000 }], error: null },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getTenantHealthScore('t1');

      expect(result.profitabilityPercent).toBe(100);
      expect(result.healthScore).toBe(100);
    });

    it('returns zeroed metrics when there are no projects', async () => {
      service = await buildService({
        projects: { data: [], error: null },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getTenantHealthScore('t1');

      expect(result.totalRevenue).toBe(0);
      expect(result.profitabilityPercent).toBe(0);
      expect(result.healthScore).toBe(0);
      expect(result.projectCount).toBe(0);
      expect(result.averageEHR).toBe(0);
    });

    it('sets tenantId on the response', async () => {
      service = await buildService({
        projects: { data: [], error: null },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      const result = await service.getTenantHealthScore('tenant-xyz');
      expect(result.tenantId).toBe('tenant-xyz');
    });

    it('throws when projects query fails', async () => {
      service = await buildService({
        projects: { data: null, error: { message: 'Projects error' } },
        expenses: { data: [], error: null },
        time_entries: { data: [], error: null },
      });

      await expect(service.getTenantHealthScore('t1')).rejects.toThrow(
        'Failed to fetch projects: Projects error',
      );
    });

    it('throws when expenses query fails', async () => {
      service = await buildService({
        projects: { data: [], error: null },
        expenses: { data: null, error: { message: 'Expenses error' } },
        time_entries: { data: [], error: null },
      });

      await expect(service.getTenantHealthScore('t1')).rejects.toThrow(
        'Failed to fetch expenses: Expenses error',
      );
    });

    it('throws when time_entries query fails', async () => {
      service = await buildService({
        projects: { data: [], error: null },
        expenses: { data: [], error: null },
        time_entries: { data: null, error: { message: 'Time error' } },
      });

      await expect(service.getTenantHealthScore('t1')).rejects.toThrow(
        'Failed to fetch time entries: Time error',
      );
    });
  });
});
