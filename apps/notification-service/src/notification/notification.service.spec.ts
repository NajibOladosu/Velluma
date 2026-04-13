import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';
import { NotificationService } from './notification.service';

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

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('NotificationService', () => {
  let service: NotificationService;
  let chain: ReturnType<typeof makeChain>;
  let mockFetch: jest.SpyInstance;

  const mockSupabaseService = {
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    chain = makeChain();
    mockSupabaseService.getClient.mockReturnValue({
      from: jest.fn().mockReturnValue(chain),
    });

    // Default: insert succeeds (insert returns the chain; no single() needed)
    chain.insert.mockReturnValue(chain);

    // Spy on the global fetch
    mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'resend-msg-123' }),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'RESEND_API_KEY') return 're_test_key';
              if (key === 'EMAIL_FROM') return 'noreply@velluma.com';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  // ── sendEmail ─────────────────────────────────────────────────────────────

  describe('sendEmail()', () => {
    const emailData = {
      to: 'user@example.com',
      subject: 'Contract Signed',
      template: 'Your contract {{contractId}} has been signed.',
      variables: { contractId: 'c-1' },
      userId: 'user-1',
    };

    it('stores a notification record and sends via Resend', async () => {
      const result = await service.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend-msg-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'email',
            title: emailData.subject,
          }),
        ]),
      );
    });

    it('interpolates template variables correctly', async () => {
      await service.sendEmail(emailData);

      // The notification stored should have the rendered template
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Your contract c-1 has been signed.',
          }),
        ]),
      );
    });

    it('returns queued:true and success:false when Resend responds with non-2xx', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: jest.fn().mockResolvedValue('Bad API key'),
      } as unknown as Response);

      const result = await service.sendEmail(emailData);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('returns queued:true when RESEND_API_KEY is not set', async () => {
      const module = await Test.createTestingModule({
        providers: [
          NotificationService,
          {
            provide: require('supabase-lib').SupabaseService,
            useValue: mockSupabaseService,
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const noKeyService = module.get<NotificationService>(NotificationService);
      const result = await noKeyService.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── sendSms ───────────────────────────────────────────────────────────────

  describe('sendSms()', () => {
    it('stores an SMS notification and returns queued:true when Twilio is not set', async () => {
      const result = await service.sendSms({
        to: '+1234567890',
        message: 'Your contract is ready',
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'sms' }),
        ]),
      );
    });
  });

  // ── listNotifications ─────────────────────────────────────────────────────

  describe('listNotifications()', () => {
    it('returns notifications for the user', async () => {
      const notifications = [
        { id: 'n1', type: 'email', title: 'Contract Signed', is_read: false },
        { id: 'n2', type: 'sms', title: 'SMS', is_read: true },
      ];
      // listNotifications uses .limit() as terminal call
      chain.limit = jest
        .fn()
        .mockResolvedValue({ data: notifications, error: null });

      const result = await service.listNotifications('user-1');

      expect(result).toEqual(notifications);
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('throws when Supabase returns an error', async () => {
      chain.limit = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(service.listNotifications('user-1')).rejects.toMatchObject({
        message: 'DB error',
      });
    });
  });
});
