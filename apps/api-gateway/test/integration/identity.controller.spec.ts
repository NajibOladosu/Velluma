import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdentityController } from '../../src/identity/identity.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [IdentityController],
    providers: [{ provide: 'IDENTITY_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('IdentityController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /identity/provision ──────────────────────────────────────────────

  describe('POST /identity/provision', () => {
    const payload = { ownerId: 'user-1', email: 'owner@example.com' };

    it('provisions a tenant and returns the result', async () => {
      const expected = { tenantId: 't-1', ownerId: 'user-1' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/identity/provision')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith(
        'get_or_create_tenant',
        payload,
      );
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Cannot provision tenant')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/identity/provision')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /identity/tenant ──────────────────────────────────────────────────

  describe('GET /identity/tenant', () => {
    it('returns the tenant record', async () => {
      const expected = { id: 't-1', name: 'My Workspace' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .get('/identity/tenant')
        .send({ tenantId: 't-1' });

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_tenant', {
        tenantId: 't-1',
      });
    });
  });

  // ── POST /identity/stripe-onboarding ─────────────────────────────────────

  describe('POST /identity/stripe-onboarding', () => {
    it('returns the Stripe Connect onboarding URL', async () => {
      const expected = { url: 'https://connect.stripe.com/setup/e/abc' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/identity/stripe-onboarding')
        .send({ tenantId: 't-1' });

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith(
        'get_stripe_onboarding_link',
        { tenantId: 't-1' },
      );
    });

    it('returns 500 when Stripe is not configured', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Stripe not configured')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/identity/stripe-onboarding')
        .send({ tenantId: 't-1' });

      expect(status).toBe(500);
    });
  });
});
