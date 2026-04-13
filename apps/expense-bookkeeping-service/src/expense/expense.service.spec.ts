import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from 'supabase-lib';
import { ExpenseService } from './expense.service';

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

describe('ExpenseService', () => {
  let service: ExpenseService;
  let mock: ReturnType<typeof makeSupabaseMock>;

  const baseExpense = {
    projectId: 'project-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    description: 'Adobe subscription',
    amount: 54.99,
    category: 'software',
    date: '2026-04-01',
  };

  beforeEach(async () => {
    mock = makeSupabaseMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: SupabaseService, useValue: mock.service },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
  });

  // ── createExpense ─────────────────────────────────────────────────────────

  describe('createExpense()', () => {
    it('inserts an expense and returns it', async () => {
      const expected = {
        id: 'exp-1',
        ...baseExpense,
        currency: 'USD',
        status: 'pending',
      };
      mock.chain.single.mockResolvedValueOnce({ data: expected, error: null });

      const result = await service.createExpense(baseExpense);

      expect(result).toEqual(expected);
      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            amount: 54.99,
            category: 'software',
            status: 'pending',
          }),
        ]),
      );
    });

    it('defaults currency to USD when not provided', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'exp-1', currency: 'USD' },
        error: null,
      });

      await service.createExpense(baseExpense);

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ currency: 'USD' }),
        ]),
      );
    });

    it('uses the provided currency when specified', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'exp-1', currency: 'GBP' },
        error: null,
      });

      await service.createExpense({ ...baseExpense, currency: 'GBP' });

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ currency: 'GBP' }),
        ]),
      );
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' },
      });

      await expect(service.createExpense(baseExpense)).rejects.toThrow(
        'Failed to create expense',
      );
    });
  });

  // ── listExpenses ──────────────────────────────────────────────────────────

  describe('listExpenses()', () => {
    it('returns expenses for the project', async () => {
      const expenses = [
        { id: 'exp-1', description: 'Adobe', amount: 54.99 },
        { id: 'exp-2', description: 'GitHub', amount: 9.99 },
      ];
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: expenses, error: null });

      const result = await service.listExpenses({
        projectId: 'project-1',
        tenantId: 'tenant-1',
      });

      expect(result).toEqual(expenses);
      expect(mock.chain.eq).toHaveBeenCalledWith('project_id', 'project-1');
      expect(mock.chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    });

    it('returns an empty array when there are no expenses', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      const result = await service.listExpenses({
        projectId: 'project-1',
        tenantId: 'tenant-1',
      });

      expect(result).toEqual([]);
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(
        service.listExpenses({ projectId: 'p', tenantId: 't' }),
      ).rejects.toMatchObject({ message: 'DB error' });
    });
  });

  // ── updateExpense ─────────────────────────────────────────────────────────

  describe('updateExpense()', () => {
    it('updates an expense and returns the updated record', async () => {
      const updated = { id: 'exp-1', status: 'approved' };
      mock.chain.single.mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.updateExpense('exp-1', {
        description: 'New description',
      });

      expect(result).toEqual(updated);
      expect(mock.chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New description' }),
      );
      expect(mock.chain.eq).toHaveBeenCalledWith('id', 'exp-1');
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        service.updateExpense('missing', { description: 'x' }),
      ).rejects.toMatchObject({ message: 'Not found' });
    });
  });

  // ── deleteExpense ─────────────────────────────────────────────────────────

  describe('deleteExpense()', () => {
    it('deletes the expense and returns success', async () => {
      // delete().eq() is terminal and resolves with { error: null }
      mock.chain.eq = jest
        .fn()
        .mockResolvedValue({ error: null });

      const result = await service.deleteExpense('exp-1');

      expect(result).toEqual({ success: true });
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.eq = jest
        .fn()
        .mockResolvedValue({ error: { message: 'Cannot delete' } });

      await expect(service.deleteExpense('exp-1')).rejects.toMatchObject({
        message: 'Cannot delete',
      });
    });
  });

  // ── getExpenseSummary ─────────────────────────────────────────────────────

  describe('getExpenseSummary()', () => {
    it('calculates totals and groups by category', async () => {
      const rows = [
        { amount: 54.99, currency: 'USD', category: 'software', status: 'pending' },
        { amount: 9.99, currency: 'USD', category: 'software', status: 'approved' },
        { amount: 200.0, currency: 'USD', category: 'travel', status: 'pending' },
      ];
      // getExpenseSummary: .select().eq().eq() — last eq resolves
      const summaryChain: any = {};
      summaryChain.select = jest.fn().mockReturnValue(summaryChain);
      summaryChain.eq = jest
        .fn()
        .mockReturnValueOnce(summaryChain)
        .mockResolvedValueOnce({ data: rows, error: null });

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(summaryChain),
      });

      const result = await service.getExpenseSummary({
        projectId: 'project-1',
        tenantId: 'tenant-1',
      });

      expect(result.total).toBeCloseTo(264.98, 2);
      expect(result.count).toBe(3);
      expect(result.byCategory['software']).toBeCloseTo(64.98, 2);
      expect(result.byCategory['travel']).toBe(200);
      expect(result.currency).toBe('USD');
    });

    it('returns zero totals when there are no expenses', async () => {
      const summaryChain: any = {};
      summaryChain.select = jest.fn().mockReturnValue(summaryChain);
      summaryChain.eq = jest
        .fn()
        .mockReturnValueOnce(summaryChain)
        .mockResolvedValueOnce({ data: [], error: null });

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(summaryChain),
      });

      const result = await service.getExpenseSummary({
        projectId: 'p',
        tenantId: 't',
      });

      expect(result.total).toBe(0);
      expect(result.count).toBe(0);
      expect(result.byCategory).toEqual({});
      expect(result.currency).toBe('USD');
    });

    it('throws when Supabase returns an error', async () => {
      const errChain: any = {};
      errChain.select = jest.fn().mockReturnValue(errChain);
      errChain.eq = jest
        .fn()
        .mockReturnValueOnce(errChain)
        .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      mock.service.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue(errChain),
      });

      await expect(
        service.getExpenseSummary({ projectId: 'p', tenantId: 't' }),
      ).rejects.toMatchObject({ message: 'DB error' });
    });
  });
});
