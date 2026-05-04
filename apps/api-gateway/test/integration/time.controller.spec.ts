import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TimeController } from '../../src/time/time.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [TimeController],
    providers: [{ provide: 'TIME_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('TimeController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /time/timers/start ───────────────────────────────────────────────

  describe('POST /time/timers/start', () => {
    const payload = {
      contractId: 'contract-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
    };

    it('starts a timer and returns the session', async () => {
      const expected = {
        sessionId: 'session-1',
        startedAt: '2026-01-01T00:00:00Z',
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/time/timers/start')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('start_timer', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Active timer already running')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/time/timers/start')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── PUT /time/timers/:id/stop ─────────────────────────────────────────────

  describe('PUT /time/timers/:id/stop', () => {
    it('stops the timer and returns the time entry', async () => {
      const expected = { entryId: 'entry-1', durationMinutes: 45 };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).put(
        '/time/timers/session-1/stop',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('stop_timer', {
        timerId: 'session-1',
      });
    });

    it('returns 500 when there is no active session', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('No active session found')),
      );

      const { status } = await request(app.getHttpServer()).put(
        '/time/timers/session-missing/stop',
      );

      expect(status).toBe(500);
    });
  });

  // ── GET /time/project/:projectId/timers ───────────────────────────────────

  describe('GET /time/project/:projectId/timers', () => {
    it('returns all time entries for a project', async () => {
      const expected = [
        { id: 'e1', durationMinutes: 60 },
        { id: 'e2', durationMinutes: 30 },
      ];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/time/project/project-1/timers',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_timers', {
        projectId: 'project-1',
      });
    });
  });
});
