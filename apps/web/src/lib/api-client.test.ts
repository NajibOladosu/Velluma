import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, apiClient, api } from './api-client';

// ──────────────────────────────────────────────────────────────────────────────
// Supabase client mock — must be set up before the module is loaded
// ──────────────────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  })),
}));

// ──────────────────────────────────────────────────────────────────────────────
// fetch mock
// ──────────────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Prevent jsdom from throwing on window.location redirect
vi.stubGlobal('window', {
  ...globalThis.window,
  location: { href: '' },
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function mockSession(token: string | null = 'test-access-token') {
  mockGetSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
  });
}

function mockResponse(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
) {
  mockFetch.mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('has the correct name and properties', () => {
    const error = new ApiError('Not found', 404, { detail: 'missing' });
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.body).toEqual({ detail: 'missing' });
  });

  it('is an instance of Error', () => {
    expect(new ApiError('err', 500)).toBeInstanceOf(Error);
  });
});

describe('apiClient()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
  });

  it('makes a GET request and returns parsed JSON', async () => {
    const data = { id: '1', name: 'Acme' };
    mockResponse(200, data);

    const result = await apiClient<typeof data>('/crm/clients/1');

    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/crm/clients/1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('injects the Authorization header when a session exists', async () => {
    mockResponse(200, {});

    await apiClient('/test');

    const [, config] = mockFetch.mock.calls[0];
    expect((config.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-access-token',
    );
  });

  it('does not add Authorization header when no session', async () => {
    mockSession(null);
    mockResponse(200, {});

    await apiClient('/test');

    const [, config] = mockFetch.mock.calls[0];
    expect((config.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('uses POST when a body is provided', async () => {
    mockResponse(201, { id: 'new' });

    await apiClient('/contracts/sign', { body: { contractId: 'c-1' } });

    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('POST');
    expect(config.body).toBe(JSON.stringify({ contractId: 'c-1' }));
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: vi.fn(), text: vi.fn() });

    const result = await apiClient('/resource');

    expect(result).toBeUndefined();
  });

  it('throws ApiError for non-2xx responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ message: 'Validation failed' }),
      text: vi.fn(),
    });

    await expect(apiClient('/invalid')).rejects.toBeInstanceOf(ApiError);
  });

  it('includes the status code on the thrown ApiError', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error()),
      text: vi.fn().mockResolvedValue('Service Unavailable'),
    });

    await expect(apiClient('/down')).rejects.toMatchObject({ status: 503 });
  });

  it('signs out and redirects on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn(),
      text: vi.fn(),
    });

    await expect(apiClient('/protected')).rejects.toMatchObject({ status: 401 });
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe('api convenience wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession();
  });

  it('api.get() sets method to GET', async () => {
    mockResponse(200, []);
    await api.get('/crm/clients');
    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('GET');
  });

  it('api.post() sets method to POST and serialises body', async () => {
    mockResponse(201, { id: 'c-1' });
    await api.post('/crm/clients', { name: 'Acme' });
    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('POST');
    expect(config.body).toBe(JSON.stringify({ name: 'Acme' }));
  });

  it('api.put() sets method to PUT', async () => {
    mockResponse(200, {});
    await api.put('/crm/clients/c-1', { name: 'Acme Updated' });
    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('PUT');
  });

  it('api.patch() sets method to PATCH', async () => {
    mockResponse(200, {});
    await api.patch('/crm/clients/c-1', { name: 'Patch' });
    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('PATCH');
  });

  it('api.delete() sets method to DELETE', async () => {
    mockResponse(204, undefined, true);
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: vi.fn(), text: vi.fn() });
    await api.delete('/crm/clients/c-1');
    const [, config] = mockFetch.mock.calls[0];
    expect(config.method).toBe('DELETE');
  });
});
