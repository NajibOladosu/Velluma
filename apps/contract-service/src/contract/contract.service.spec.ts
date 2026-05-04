import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from './contract.service';
import { SupabaseService } from 'supabase-lib';

// ──────────────────────────────────────────────────────────────────────────────
// Supabase chain mock factory — reusable across tests
// ──────────────────────────────────────────────────────────────────────────────

function makeChain() {
  const chain: any = {};
  [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'order',
    'limit',
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

function makeSupabaseMock() {
  const chain = makeChain();
  const client = {
    from: jest.fn().mockReturnValue(chain),
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    _chain: chain,
  };
  return {
    service: { getClient: jest.fn().mockReturnValue(client) },
    client,
    chain,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('ContractService', () => {
  let service: ContractService;
  let mock: ReturnType<typeof makeSupabaseMock>;

  const baseContract = {
    id: 'contract-1',
    status: 'draft',
    tenant_id: 'tenant-1',
    creator_id: 'user-1',
  };
  const baseDoc = { id: 'doc-1', content: { text: 'Hello' } };

  beforeEach(async () => {
    mock = makeSupabaseMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: SupabaseService, useValue: mock.service },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  // ── generateFromPrompt ────────────────────────────────────────────────────

  describe('generateFromPrompt()', () => {
    it('inserts a contract record and a contract_document', async () => {
      mock.chain.single
        .mockResolvedValueOnce({ data: baseContract, error: null }) // contracts insert
        .mockResolvedValueOnce({ data: {}, error: null }); // contract_documents insert (no single, uses insert directly)

      // contract_documents insert doesn't call single(), it returns { error }
      mock.chain.insert
        .mockReturnValueOnce(mock.chain) // contracts insert → chained
        .mockReturnValueOnce({ error: null }); // contract_documents insert → terminal

      const result = await service.generateFromPrompt({
        tenantId: 'tenant-1',
        userId: 'user-1',
        prompt: 'Design a software development agreement',
      });

      expect(result.contractId).toBe(baseContract.id);
      expect(result.content).toContain(
        'Design a software development agreement',
      );
    });

    it('throws when contracts insert fails', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(
        service.generateFromPrompt({
          tenantId: 't',
          userId: 'u',
          prompt: 'test',
        }),
      ).rejects.toBeDefined();
    });
  });

  // ── signContract ──────────────────────────────────────────────────────────

  describe('signContract()', () => {
    const signData = {
      contractId: 'contract-1',
      userId: 'user-1',
      signatureBase64: 'base64data',
      tenantId: 'tenant-1',
      role: 'freelancer' as const,
    };

    it('records a signature when no previous signature exists', async () => {
      mock.chain.single
        .mockResolvedValueOnce({ data: baseContract, error: null }) // fetch contract
        .mockResolvedValueOnce({ data: baseDoc, error: null }); // fetch latest doc
      mock.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // no duplicate

      const result = await service.signContract(signData);

      expect(result.success).toBe(true);
      expect(result.agreementHash).toBeDefined();
      expect(result.agreementHash).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('throws when the user has already signed', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: baseContract,
        error: null,
      });
      // maybeSingle returns existing signature
      mock.chain.maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-sig' },
        error: null,
      });

      await expect(service.signContract(signData)).rejects.toThrow(
        /already signed/,
      );
    });

    it('throws when the contract is not found', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.signContract(signData)).rejects.toThrow(
        'Contract not found',
      );
    });
  });

  // ── createChangeRequest ───────────────────────────────────────────────────

  describe('createChangeRequest()', () => {
    it('inserts and returns the change request', async () => {
      const expected = { id: 'cr-1', status: 'open' };
      mock.chain.single.mockResolvedValueOnce({ data: expected, error: null });

      const result = await service.createChangeRequest({
        contractId: 'contract-1',
        tenantId: 'tenant-1',
        requesterId: 'user-1',
        details: 'Please update payment terms',
      });

      expect(result).toEqual(expected);
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' },
      });

      await expect(
        service.createChangeRequest({
          contractId: 'c',
          tenantId: 't',
          requesterId: 'u',
          details: 'd',
        }),
      ).rejects.toBeDefined();
    });
  });

  // ── getAuditLog ───────────────────────────────────────────────────────────

  describe('getAuditLog()', () => {
    it('returns audit log entries for a contract', async () => {
      const entries = [
        { id: 'a1', action: 'contract_signed' },
        { id: 'a2', action: 'contract_signed' },
      ];
      // getAuditLog uses .select().eq().eq().order() — no single()
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: entries, error: null });

      const result = await service.getAuditLog('contract-1');
      expect(result).toEqual(entries);
    });

    it('throws when Supabase returns an error', async () => {
      mock.chain.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(service.getAuditLog('c')).rejects.toBeDefined();
    });
  });
});
