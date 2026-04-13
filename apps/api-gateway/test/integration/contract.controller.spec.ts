import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ContractController } from '../../src/contract/contract.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ContractController],
    providers: [{ provide: 'CONTRACT_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('ContractController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /contracts/sign ──────────────────────────────────────────────────

  describe('POST /contracts/sign', () => {
    const payload = {
      contractId: 'contract-1',
      userId: 'user-1',
      signatureBase64: 'base64data',
      tenantId: 'tenant-1',
      role: 'freelancer',
    };

    it('returns the result from CONTRACT_SERVICE', async () => {
      const expected = {
        success: true,
        agreementHash: 'abc'.repeat(21) + 'a', // 64-char hex-like
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/contracts/sign')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('sign_contract', payload);
    });

    it('propagates errors from the microservice', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('User has already signed')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/contracts/sign')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /contracts/audit/:projectId ──────────────────────────────────────

  describe('GET /contracts/audit/:projectId', () => {
    it('returns audit log entries for a project', async () => {
      const expected = [
        { id: 'a1', action: 'contract_signed' },
        { id: 'a2', action: 'contract_signed' },
      ];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/contracts/audit/contract-1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_audit_log', {
        projectId: 'contract-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('DB error')));

      const { status } = await request(app.getHttpServer()).get(
        '/contracts/audit/contract-1',
      );

      expect(status).toBe(500);
    });
  });
});
