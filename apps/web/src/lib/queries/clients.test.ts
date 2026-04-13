import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  clientKeys,
  useUpdateClient,
  useDeleteClient,
  type ClientRow,
} from './clients';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/client';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const sampleClient: ClientRow = {
  id: 'cl-1',
  tenant_id: 't1',
  created_at: '2026-01-01T00:00:00Z',
  name: 'Acme Corp',
  email: 'contact@acme.com',
  company_name: 'Acme Inc',
  linkedin_profile: null,
  health_score: 80,
  tags: ['enterprise'],
  metadata: null,
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. clientKeys key factory
// ──────────────────────────────────────────────────────────────────────────────

describe('clientKeys', () => {
  it('all returns the base key', () => {
    expect(clientKeys.all).toEqual(['clients']);
  });

  it('lists() returns the list key under the base', () => {
    expect(clientKeys.lists()).toEqual(['clients', 'list']);
  });

  it('lists() key starts with the base all key', () => {
    const lists = clientKeys.lists();
    expect(lists[0]).toBe(clientKeys.all[0]);
  });

  it('detail() returns a unique key for each id', () => {
    const keyA = clientKeys.detail('client-1');
    const keyB = clientKeys.detail('client-2');
    expect(keyA).not.toEqual(keyB);
    expect(keyA).toEqual(['clients', 'detail', 'client-1']);
    expect(keyB).toEqual(['clients', 'detail', 'client-2']);
  });

  it('detail() key starts with the base all key', () => {
    const detail = clientKeys.detail('client-1');
    expect(detail[0]).toBe(clientKeys.all[0]);
  });

  it('lists() and detail() share the same root but are distinct', () => {
    const lists = clientKeys.lists();
    const detail = clientKeys.detail('client-1');
    expect(lists[1]).toBe('list');
    expect(detail[1]).toBe('detail');
  });
});

// ---------------------------------------------------------------------------
// 2. useUpdateClient — mutation
// ---------------------------------------------------------------------------

describe('useUpdateClient', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it('updates client fields and returns updated row', async () => {
    const updatedRow = { ...sampleClient, name: 'New Name' }
    const singleMock = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: 'cl-1', name: 'New Name' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }))
    expect(result.current.data!.name).toBe('New Name')
  })

  it('throws when Supabase update fails', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useUpdateClient(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate({ id: 'cl-1', email: 'bad@example.com' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Update failed')
  })
})

// ---------------------------------------------------------------------------
// 3. useDeleteClient — mutation
// ---------------------------------------------------------------------------

describe('useDeleteClient', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.clearAllMocks()
  })

  it('deletes the client row by id', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate('cl-1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'cl-1')
  })

  it('throws when Supabase delete fails', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteMock }),
      auth: { getUser: vi.fn() },
    } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useDeleteClient(), {
      wrapper: wrapper(queryClient),
    })

    await act(async () => {
      result.current.mutate('cl-1')
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Delete failed')
  })
});
