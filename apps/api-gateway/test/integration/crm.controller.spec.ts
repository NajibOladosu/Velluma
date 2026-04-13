import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CrmController } from '../../src/crm/crm.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [CrmController],
    providers: [{ provide: 'CRM_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('CrmController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /crm/clients?tenantId= ────────────────────────────────────────────

  describe('GET /crm/clients', () => {
    it('returns the list of clients for a tenant', async () => {
      const expected = [{ id: 'c1', name: 'Acme Corp' }];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .get('/crm/clients')
        .query({ tenantId: 'tenant-1' });

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_clients', {
        tenantId: 'tenant-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('DB error')));

      const { status } = await request(app.getHttpServer())
        .get('/crm/clients')
        .query({ tenantId: 'tenant-1' });

      expect(status).toBe(500);
    });
  });

  // ── POST /crm/clients ─────────────────────────────────────────────────────

  describe('POST /crm/clients', () => {
    const payload = {
      tenantId: 'tenant-1',
      name: 'Acme Corp',
      email: 'contact@acme.com',
    };

    it('creates a client and returns the result', async () => {
      const expected = { id: 'c1', ...payload };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/crm/clients')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('create_client', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Constraint violation')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/crm/clients')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /crm/clients/:id ──────────────────────────────────────────────────

  describe('GET /crm/clients/:id', () => {
    it('returns the client details', async () => {
      const expected = { id: 'c1', name: 'Acme Corp', projects: [] };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/crm/clients/c1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_client_details', {
        clientId: 'c1',
      });
    });
  });
});
