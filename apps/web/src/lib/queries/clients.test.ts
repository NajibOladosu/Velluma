import { describe, it, expect } from 'vitest';
import { clientKeys } from './clients';

// ──────────────────────────────────────────────────────────────────────────────
// clientKeys key factory
// ──────────────────────────────────────────────────────────────────────────────
// The hooks (useClients, useClient, useCreateClient) require a full React +
// TanStack Query environment to test. The key factory is pure and can be
// tested without mocking anything.

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
