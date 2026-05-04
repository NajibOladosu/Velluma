import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from 'supabase-lib';
import { ResourceService } from './resource.service';

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

describe('ResourceService', () => {
  let service: ResourceService;
  let mock: ReturnType<typeof makeSupabaseMock>;

  beforeEach(async () => {
    mock = makeSupabaseMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        { provide: SupabaseService, useValue: mock.service },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
  });

  // ── addDeliverable ────────────────────────────────────────────────────────

  describe('addDeliverable()', () => {
    const input = {
      projectId: 'project-1',
      tenantId: 'tenant-1',
      name: 'Final design file',
      description: 'Figma export',
      fileUrl: 'https://storage.example.com/file.fig',
      type: 'file',
    };

    it('inserts a deliverable into project_deliverables and returns it', async () => {
      const expected = { id: 'd-1', ...input };
      mock.chain.single.mockResolvedValueOnce({ data: expected, error: null });

      const result = await service.addDeliverable(input);

      expect(result).toEqual(expected);
      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            name: 'Final design file',
            file_url: 'https://storage.example.com/file.fig',
            type: 'file',
          }),
        ]),
      );
    });

    it('sets description to null when not provided', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: { id: 'd-1' },
        error: null,
      });

      await service.addDeliverable({ ...input, description: undefined });

      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ description: null }),
        ]),
      );
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' },
      });

      await expect(service.addDeliverable(input)).rejects.toThrow(
        'Failed to add deliverable',
      );
    });
  });

  // ── listResources ─────────────────────────────────────────────────────────

  describe('listResources()', () => {
    it('returns all deliverables for the project', async () => {
      const deliverables = [
        { id: 'd-1', name: 'Final design file', type: 'file' },
        { id: 'd-2', name: 'API spec', type: 'document' },
      ];
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: deliverables, error: null });

      const result = await service.listResources('project-1');

      expect(result).toEqual(deliverables);
      expect(mock.chain.eq).toHaveBeenCalledWith('project_id', 'project-1');
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(service.listResources('project-1')).rejects.toMatchObject({
        message: 'DB error',
      });
    });
  });
});
