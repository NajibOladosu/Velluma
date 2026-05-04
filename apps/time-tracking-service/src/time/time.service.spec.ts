import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from 'supabase-lib';
import { TimeService } from './time.service';

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
      getClient: jest
        .fn()
        .mockReturnValue({ from: jest.fn().mockReturnValue(chain) }),
    },
    chain,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('TimeService', () => {
  let service: TimeService;
  let mock: ReturnType<typeof makeSupabaseMock>;

  beforeEach(async () => {
    mock = makeSupabaseMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeService,
        { provide: SupabaseService, useValue: mock.service },
      ],
    }).compile();

    service = module.get<TimeService>(TimeService);
  });

  // ── startTimer ────────────────────────────────────────────────────────────

  describe('startTimer()', () => {
    const input = {
      projectId: 'project-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
    };

    it('inserts a session record and returns it', async () => {
      const session = {
        id: 'session-1',
        contract_id: 'project-1',
        is_active: true,
      };
      mock.chain.single.mockResolvedValueOnce({ data: session, error: null });

      const result = await service.startTimer(input);

      expect(result).toEqual(session);
      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            contract_id: 'project-1',
            freelancer_id: 'user-1',
            is_active: true,
          }),
        ]),
      );
    });

    it('uses "Work session" as the default task description', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'session-1' },
        error: null,
      });

      await service.startTimer(input);

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ task_description: 'Work session' }),
        ]),
      );
    });

    it('uses the provided taskDescription when given', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'session-1' },
        error: null,
      });

      await service.startTimer({
        ...input,
        taskDescription: 'Build login page',
      });

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ task_description: 'Build login page' }),
        ]),
      );
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.startTimer(input)).rejects.toThrow(
        'Failed to start timer',
      );
    });
  });

  // ── stopTimer ─────────────────────────────────────────────────────────────

  describe('stopTimer()', () => {
    it('marks the session inactive and creates a time entry', async () => {
      const session = {
        id: 'session-1',
        contract_id: 'project-1',
        freelancer_id: 'user-1',
        task_description: 'Work session',
        start_time: new Date(Date.now() - 60 * 60_000).toISOString(), // 1 hour ago
        is_active: true,
      };

      // fetch session
      mock.chain.single
        .mockResolvedValueOnce({ data: session, error: null })
        // update session
        .mockResolvedValueOnce({
          data: { ...session, is_active: false },
          error: null,
        })
        // insert time entry
        .mockResolvedValueOnce({
          data: { id: 'entry-1', duration_minutes: 60 },
          error: null,
        });

      const result = await service.stopTimer('session-1');

      expect(result.durationMinutes).toBeGreaterThan(0);
      expect(result.entry).toBeTruthy();
      expect(mock.chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it('throws when the session is not found', async () => {
      mock.chain.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.stopTimer('missing')).rejects.toThrow(
        'Timer session not found',
      );
    });

    it('returns null entry when time_entry insert fails (non-critical)', async () => {
      const session = {
        id: 'session-1',
        contract_id: 'project-1',
        freelancer_id: 'user-1',
        task_description: 'Work',
        start_time: new Date(Date.now() - 10_000).toISOString(),
        is_active: true,
      };

      mock.chain.single
        .mockResolvedValueOnce({ data: session, error: null })
        .mockResolvedValueOnce({
          data: { ...session, is_active: false },
          error: null,
        })
        // entry insert fails — non-critical
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Insert failed' },
        });

      const result = await service.stopTimer('session-1');

      // entry is null but the call doesn't throw
      expect(result.entry).toBeNull();
      expect(result.durationMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  // ── listTimers ────────────────────────────────────────────────────────────

  describe('listTimers()', () => {
    it('returns time entries for the project', async () => {
      const entries = [
        { id: 'e1', duration_minutes: 60 },
        { id: 'e2', duration_minutes: 30 },
      ];
      // listTimers uses .order() as terminal call
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: entries, error: null });

      const result = await service.listTimers('project-1');

      expect(result).toEqual(entries);
      expect(mock.chain.eq).toHaveBeenCalledWith('contract_id', 'project-1');
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(service.listTimers('project-1')).rejects.toMatchObject({
        message: 'DB error',
      });
    });
  });
});
