import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { NotificationController } from '../../src/notification/notification.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [NotificationController],
    providers: [{ provide: 'NOTIFICATION_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('NotificationController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /notifications/email ─────────────────────────────────────────────

  describe('POST /notifications/email', () => {
    const payload = {
      to: 'user@example.com',
      subject: 'Contract Signed',
      template: 'contract_signed',
      data: { contractId: 'c-1' },
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    it('sends an email notification and returns the result', async () => {
      const expected = { notificationId: 'n-1', status: 'sent' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/notifications/email')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('send_email', payload);
    });

    it('returns 500 when the email provider fails', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Email delivery failed')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/notifications/email')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── POST /notifications/sms ───────────────────────────────────────────────

  describe('POST /notifications/sms', () => {
    const payload = {
      to: '+1234567890',
      message: 'Your contract is ready',
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    it('sends an SMS notification and returns the result', async () => {
      const expected = { notificationId: 'n-2', status: 'sent' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/notifications/sms')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('send_sms', payload);
    });
  });

  // ── GET /notifications/tenant/:tenantId ───────────────────────────────────

  describe('GET /notifications/tenant/:tenantId', () => {
    it('returns the notification list for a tenant', async () => {
      const expected = [
        { id: 'n-1', template: 'contract_signed', status: 'sent' },
        { id: 'n-2', template: 'payment_received', status: 'sent' },
      ];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/notifications/tenant/tenant-1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_notifications', {
        tenantId: 'tenant-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('DB error')));

      const { status } = await request(app.getHttpServer()).get(
        '/notifications/tenant/tenant-1',
      );

      expect(status).toBe(500);
    });
  });
});
