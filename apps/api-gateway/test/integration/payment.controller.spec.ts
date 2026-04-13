import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PaymentController } from '../../src/finance/payment.controller';

// ──────────────────────────────────────────────────────────────────────────────
// ClientProxy mock
// ──────────────────────────────────────────────────────────────────────────────

const mockClient = {
  send: jest.fn(),
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [PaymentController],
    providers: [{ provide: 'FINANCE_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('PaymentController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /payments/escrow/fund ────────────────────────────────────────────

  describe('POST /payments/escrow/fund', () => {
    const payload = {
      milestoneId: 'ms-1',
      amount: 500,
      tenantId: 'tenant-1',
      clientId: 'client-1',
    };

    it('returns the result from the FINANCE_SERVICE', async () => {
      const expected = { clientSecret: 'secret_xyz', escrowRecordId: 'esc-1' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/payments/escrow/fund')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith(
        'create_escrow_payment',
        payload,
      );
    });

    it('propagates errors from the microservice as 500', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/payments/escrow/fund')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── POST /payments/escrow/release/:milestoneId ────────────────────────────

  describe('POST /payments/escrow/release/:milestoneId', () => {
    it('calls release_escrow with the correct milestoneId', async () => {
      const expected = { success: true, transferId: 'tr_test123' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).post(
        '/payments/escrow/release/ms-1',
      );

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('release_escrow', {
        milestoneId: 'ms-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Stripe not configured')),
      );

      const { status } = await request(app.getHttpServer()).post(
        '/payments/escrow/release/ms-1',
      );

      expect(status).toBe(500);
    });
  });
});
