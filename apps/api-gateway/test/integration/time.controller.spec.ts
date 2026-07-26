import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TimeController } from '../../src/time/time.controller';

const mockClient = { send: jest.fn() };

// Authenticated user id injected by the middleware below, standing in for the
// SupabaseAuthGuard that populates req.user in production.
const AUTH_USER_ID = 'user-1';

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [TimeController],
    providers: [{ provide: 'TIME_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  // Simulate the auth layer so controllers that read req.user.id work.
  app.use((req: any, _res: any, next: () => void) => {
    req.user = { id: AUTH_USER_ID };
    next();
  });
  await app.init();
  return app;
}

// Routes guarded by ParseUUIDPipe require real UUIDs for :id / :projectId.
const TIMER_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_TIMER_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

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
        `/time/timers/${TIMER_ID}/stop`,
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('stop_timer', {
        timerId: TIMER_ID,
      });
    });

    it('returns 500 when there is no active session', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('No active session found')),
      );

      const { status } = await request(app.getHttpServer()).put(
        `/time/timers/${MISSING_TIMER_ID}/stop`,
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
        `/time/project/${PROJECT_ID}/timers`,
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_timers', {
        projectId: PROJECT_ID,
      });
    });
  });
});
