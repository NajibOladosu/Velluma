import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { SupabaseService } from 'supabase-lib';

// ──────────────────────────────────────────────────────────────────────────────
// Stripe mock
// ──────────────────────────────────────────────────────────────────────────────

const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'secret_test123',
    }),
  },
  transfers: {
    create: jest.fn().mockResolvedValue({ id: 'tr_test123' }),
  },
};

jest.mock('stripe', () => jest.fn().mockImplementation(() => mockStripe));

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

let dbChain = makeChain();

const mockSupabaseService = {
  getClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue(dbChain),
  }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    dbChain = makeChain();
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue(dbChain),
    });

    jest.clearAllMocks();
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'secret_test123',
    });
    mockStripe.transfers.create.mockResolvedValue({ id: 'tr_test123' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('sk_test_fake'),
          },
        },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    // Trigger OnModuleInit to initialise Stripe
    await (service as any).onModuleInit();
  });

  // ── createEscrowPayment ───────────────────────────────────────────────────

  describe('createEscrowPayment()', () => {
    const payload = {
      milestoneId: 'ms-1',
      amount: 500,
      tenantId: 'tenant-1',
      clientId: 'client-1',
    };

    it('creates a PaymentIntent with idempotency key', async () => {
      // tenant lookup
      dbChain.single.mockResolvedValueOnce({
        data: { stripe_connect_id: 'acct_123' },
        error: null,
      });
      // escrow_transactions insert
      dbChain.single.mockResolvedValueOnce({
        data: { id: 'esc-1' },
        error: null,
      });

      const result = await service.createEscrowPayment(payload);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50000, currency: 'usd' }),
        expect.objectContaining({ idempotencyKey: 'escrow_fund_ms-1' }),
      );
      expect(result.clientSecret).toBe('secret_test123');
      expect(result.escrowRecordId).toBe('esc-1');
    });

    it('converts amount to cents correctly', async () => {
      dbChain.single
        .mockResolvedValueOnce({ data: { stripe_connect_id: 'acct_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'esc-1' }, error: null });

      await service.createEscrowPayment({ ...payload, amount: 1 });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100 }), // 1 * 100 = 100 cents
        expect.anything(),
      );
    });

    it('uses provided currency', async () => {
      dbChain.single
        .mockResolvedValueOnce({ data: { stripe_connect_id: 'acct_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'esc-1' }, error: null });

      await service.createEscrowPayment({ ...payload, currency: 'gbp' });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'gbp' }),
        expect.anything(),
      );
    });

    it('throws when Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(service.createEscrowPayment(payload)).rejects.toThrow(
        'Stripe not configured',
      );
    });

    it('includes milestone and tenant metadata on the PaymentIntent', async () => {
      dbChain.single
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: { id: 'esc-1' }, error: null });

      await service.createEscrowPayment(payload);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            milestoneId: 'ms-1',
            tenantId: 'tenant-1',
            type: 'escrow_funding',
          }),
        }),
        expect.anything(),
      );
    });
  });

  // ── releaseEscrow ─────────────────────────────────────────────────────────

  describe('releaseEscrow()', () => {
    const heldTransaction = {
      id: 'esc-1',
      amount: 500,
      tenants: { stripe_connect_id: 'acct_connect_456' },
    };

    it('transfers funds and updates both records', async () => {
      dbChain.single.mockResolvedValueOnce({
        data: heldTransaction,
        error: null,
      });
      // update escrow_transactions + milestones (both don't call single)

      const result = await service.releaseEscrow('ms-1');

      expect(mockStripe.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          destination: 'acct_connect_456',
        }),
        expect.objectContaining({ idempotencyKey: 'escrow_release_ms-1' }),
      );
      expect(result.success).toBe(true);
      expect(result.transferId).toBe('tr_test123');
    });

    it('throws when no held transaction is found', async () => {
      dbChain.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.releaseEscrow('ms-missing')).rejects.toThrow(
        'No held transaction found',
      );
    });

    it('throws when freelancer has no Connect account', async () => {
      dbChain.single.mockResolvedValueOnce({
        data: { id: 'esc-1', amount: 100, tenants: { stripe_connect_id: null } },
        error: null,
      });

      await expect(service.releaseEscrow('ms-1')).rejects.toThrow(
        'no Stripe account connected',
      );
    });

    it('throws when Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(service.releaseEscrow('ms-1')).rejects.toThrow(
        'Stripe not configured',
      );
    });
  });
});
