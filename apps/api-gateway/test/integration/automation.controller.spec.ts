import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AutomationController } from '../../src/automation/automation.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AutomationController],
    providers: [{ provide: 'AUTOMATION_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('AutomationController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /automation/rules ────────────────────────────────────────────────

  describe('POST /automation/rules', () => {
    const payload = {
      tenantId: 'tenant-1',
      name: 'Auto-send invoice on milestone complete',
      trigger: 'milestone_completed',
      action: 'send_invoice',
      conditions: { delay: 0 },
    };

    it('creates an automation rule and returns the result', async () => {
      const expected = { id: 'rule-1', ...payload, is_active: true };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/automation/rules')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('create_rule', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Invalid trigger type')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/automation/rules')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /automation/rules/:tenantId ───────────────────────────────────────

  describe('GET /automation/rules/:tenantId', () => {
    it('returns all automation rules for a tenant', async () => {
      const expected = [
        { id: 'rule-1', name: 'Auto-invoice', trigger: 'milestone_completed' },
        { id: 'rule-2', name: 'Alert overdue', trigger: 'payment_overdue' },
      ];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/automation/rules/tenant-1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_rules', {
        tenantId: 'tenant-1',
      });
    });
  });

  // ── POST /automation/trigger ──────────────────────────────────────────────

  describe('POST /automation/trigger', () => {
    const payload = {
      tenantId: 'tenant-1',
      event: 'milestone_completed',
      payload: { milestoneId: 'ms-1' },
    };

    it('triggers the event and returns the number of actions fired', async () => {
      const expected = { triggered: 1, ruleId: 'rule-1' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/automation/trigger')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('trigger_event', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Action execution failed')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/automation/trigger')
        .send(payload);

      expect(status).toBe(500);
    });
  });
});
