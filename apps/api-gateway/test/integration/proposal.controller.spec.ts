import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ProposalController } from '../../src/document/proposal.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ProposalController],
    providers: [{ provide: 'DOCUMENT_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('ProposalController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /proposals ───────────────────────────────────────────────────────

  describe('POST /proposals', () => {
    const payload = {
      projectId: 'project-1',
      tenantId: 'tenant-1',
      content: { title: 'Web App Development', body: 'Scope of work...' },
    };

    it('creates a proposal and returns the result', async () => {
      const expected = { id: 'prop-1', ...payload };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/proposals')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('create_proposal', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Project not found')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/proposals')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /proposals/:id ────────────────────────────────────────────────────

  describe('GET /proposals/:id', () => {
    it('returns the proposal for the given project id', async () => {
      const expected = {
        id: 'prop-1',
        projectId: 'project-1',
        content: { title: 'Web App Development' },
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/proposals/project-1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_proposal', {
        projectId: 'project-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Proposal not found')),
      );

      const { status } = await request(app.getHttpServer()).get(
        '/proposals/missing',
      );

      expect(status).toBe(500);
    });
  });

  // ── PUT /proposals/:id ────────────────────────────────────────────────────

  describe('PUT /proposals/:id', () => {
    const updatePayload = {
      content: { title: 'Updated Web App Development', body: 'Revised scope...' },
    };

    it('updates the proposal content and returns the result', async () => {
      const expected = {
        id: 'prop-1',
        projectId: 'project-1',
        content: updatePayload.content,
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .put('/proposals/project-1')
        .send(updatePayload);

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('update_proposal', {
        projectId: 'project-1',
        content: updatePayload,
      });
    });
  });
});
