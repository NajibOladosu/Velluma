import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';
import { NotificationService } from './notification.service';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Chainable Supabase mock that is also thenable, so both
 *   await chain.eq(...).order(...).limit(...)
 * and
 *   await chain.insert([...])
 * resolve to `resolved` wherever the call chain terminates.
 */
function makeChain(resolved: { data: unknown; error: unknown }) {
  const promise = Promise.resolve(resolved);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    then: (
      onFulfilled: Parameters<Promise<unknown>['then']>[0],
      onRejected: Parameters<Promise<unknown>['then']>[1],
    ) => promise.then(onFulfilled, onRejected),
    catch: (fn: Parameters<Promise<unknown>['catch']>[0]) => promise.catch(fn),
    finally: (fn: Parameters<Promise<unknown>['finally']>[0]) =>
      promise.finally(fn),
  };
  ['select', 'eq', 'order', 'limit', 'insert'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  return chain;
}

/** Mock Twilio messages.create */
const mockTwilioCreate = jest.fn();
const mockTwilioClient = { messages: { create: mockTwilioCreate } };

async function buildService(
  configValues: Record<string, string | undefined>,
  fromMock?: jest.Mock,
): Promise<NotificationService> {
  const defaultChain = makeChain({ data: [], error: null });
  const from = fromMock ?? jest.fn().mockReturnValue(defaultChain);

  const supabaseMock = {
    getClient: jest.fn().mockReturnValue({ from }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationService,
      { provide: SupabaseService, useValue: supabaseMock },
      {
        provide: ConfigService,
        useValue: { get: jest.fn((key: string) => configValues[key]) },
      },
    ],
  }).compile();

  return module.get<NotificationService>(NotificationService);
}

/* ─────────────────────────────────────────────────────────────────────────────
   sendSms
   ───────────────────────────────────────────────────────────────────────────── */

describe('NotificationService.sendSms', () => {
  beforeEach(() => mockTwilioCreate.mockReset());

  it('always persists an SMS notification row to the DB', async () => {
    const from = jest.fn().mockReturnValue(makeChain({ data: [], error: null }));
    const svc = await buildService({}, from);

    await svc.sendSms({ to: '+14155550100', message: 'Hello', userId: 'u1' });

    expect(from).toHaveBeenCalledWith('notifications');
    const chain = from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'sms', user_id: 'u1' }),
      ]),
    );
  });

  it('returns { success: true, queued: true } when Twilio is not configured', async () => {
    const svc = await buildService({});
    const result = await svc.sendSms({ to: '+14155550100', message: 'Test' });
    expect(result).toEqual({ success: true, queued: true });
  });

  it('returns { success: true, queued: true } when TWILIO_FROM_NUMBER is missing', async () => {
    const svc = await buildService({
      TWILIO_ACCOUNT_SID: 'ACtest',
      TWILIO_AUTH_TOKEN: 'authtoken',
      // TWILIO_FROM_NUMBER omitted
    });
    // Inject mock Twilio client directly to bypass module init
    (svc as unknown as Record<string, unknown>)['twilioClient'] = mockTwilioClient;

    const result = await svc.sendSms({ to: '+14155550100', message: 'Test' });

    expect(result).toEqual({ success: true, queued: true });
    expect(mockTwilioCreate).not.toHaveBeenCalled();
  });

  it('calls Twilio messages.create with E.164 number and returns sid', async () => {
    mockTwilioCreate.mockResolvedValue({ sid: 'SM_abc123' });

    const svc = await buildService({ TWILIO_FROM_NUMBER: '+18005550100' });
    (svc as unknown as Record<string, unknown>)['twilioClient'] = mockTwilioClient;

    const result = await svc.sendSms({ to: '+14155550100', message: 'Contract ready' });

    expect(mockTwilioCreate).toHaveBeenCalledWith({
      to: '+14155550100',
      from: '+18005550100',
      body: 'Contract ready',
    });
    expect(result).toEqual({ success: true, sid: 'SM_abc123' });
  });

  it('returns { success: false, error } when Twilio API throws', async () => {
    mockTwilioCreate.mockRejectedValue(new Error('21211: Invalid To number'));

    const svc = await buildService({ TWILIO_FROM_NUMBER: '+18005550100' });
    (svc as unknown as Record<string, unknown>)['twilioClient'] = mockTwilioClient;

    const result = await svc.sendSms({ to: '+1bad', message: 'Hi' });

    expect(result).toEqual({ success: false, error: '21211: Invalid To number' });
  });

  it('sets user_id to null when userId is not provided', async () => {
    const from = jest.fn().mockReturnValue(makeChain({ data: [], error: null }));
    const svc = await buildService({}, from);

    await svc.sendSms({ to: '+14155550100', message: 'Hi' });

    const chain = from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ user_id: null }),
      ]),
    );
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   sendEmail
   ───────────────────────────────────────────────────────────────────────────── */

describe('NotificationService.sendEmail', () => {
  const emailData = {
    to: 'client@example.com',
    subject: 'Contract ready',
    template: 'Hello {{name}}, your contract is ready.',
    variables: { name: 'Alice' },
    userId: 'u1',
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'resend_001' }),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);
  });

  afterEach(() => fetchSpy.mockRestore());

  it('persists a notification row with type=email', async () => {
    const from = jest.fn().mockReturnValue(makeChain({ data: [], error: null }));
    const svc = await buildService({ RESEND_API_KEY: 'key' }, from);

    await svc.sendEmail(emailData);

    const chain = from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'email', title: emailData.subject }),
      ]),
    );
  });

  it('renders template variables before persisting', async () => {
    const from = jest.fn().mockReturnValue(makeChain({ data: [], error: null }));
    const svc = await buildService({}, from);

    await svc.sendEmail(emailData);

    const chain = from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Hello Alice, your contract is ready.' }),
      ]),
    );
  });

  it('returns { success: true, queued: true } when RESEND_API_KEY is not set', async () => {
    const svc = await buildService({});
    const result = await svc.sendEmail(emailData);
    expect(result).toEqual({ success: true, queued: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends to Resend and returns messageId on success', async () => {
    const svc = await buildService({ RESEND_API_KEY: 're_live_key' });
    const result = await svc.sendEmail(emailData);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual({ success: true, messageId: 'resend_001' });
  });

  it('returns { success: false, queued: true } when Resend returns non-2xx', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('rate limit exceeded'),
    } as unknown as Response);

    const svc = await buildService({ RESEND_API_KEY: 're_live_key' });
    const result = await svc.sendEmail(emailData);

    expect(result).toEqual({ success: false, queued: true });
  });

  it('returns { success: false, queued: true } when fetch throws', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));

    const svc = await buildService({ RESEND_API_KEY: 're_live_key' });
    const result = await svc.sendEmail(emailData);

    expect(result).toEqual({ success: false, queued: true });
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   listNotifications
   ───────────────────────────────────────────────────────────────────────────── */

describe('NotificationService.listNotifications', () => {
  it('returns the notifications list', async () => {
    const notifications = [
      { id: 'n1', type: 'email', is_read: false },
      { id: 'n2', type: 'sms', is_read: true },
    ];
    const chain = makeChain({ data: notifications, error: null });
    const svc = await buildService({}, jest.fn().mockReturnValue(chain));

    const result = await svc.listNotifications('user-abc');

    expect(result).toEqual(notifications);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    const svc = await buildService({}, jest.fn().mockReturnValue(chain));

    await expect(svc.listNotifications('user-abc')).rejects.toMatchObject({
      message: 'DB error',
    });
  });
});
