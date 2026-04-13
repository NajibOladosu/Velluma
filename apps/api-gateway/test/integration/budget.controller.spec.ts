import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { BudgetController } from '../../src/budget/budget.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [BudgetController],
    providers: [{ provide: 'BUDGET_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('BudgetController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /budget/project/:projectId/profitability ──────────────────────────

  describe('GET /budget/project/:projectId/profitability', () => {
    it('returns profitability data for the project', async () => {
      const expected = {
        projectId: 'project-1',
        revenue: 10000,
        expenses: 2500,
        profit: 7500,
        margin: 75,
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/budget/project/project-1/profitability',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_profitability', {
        projectId: 'project-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Project not found')),
      );

      const { status } = await request(app.getHttpServer()).get(
        '/budget/project/missing/profitability',
      );

      expect(status).toBe(500);
    });
  });

  // ── GET /budget/tenant/:tenantId/health ───────────────────────────────────

  describe('GET /budget/tenant/:tenantId/health', () => {
    it('returns the financial health score for the tenant', async () => {
      const expected = {
        tenantId: 'tenant-1',
        healthScore: 82,
        cashFlowStatus: 'healthy',
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/budget/tenant/tenant-1/health',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_tenant_health', {
        tenantId: 'tenant-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('DB error')));

      const { status } = await request(app.getHttpServer()).get(
        '/budget/tenant/tenant-1/health',
      );

      expect(status).toBe(500);
    });
  });
});
