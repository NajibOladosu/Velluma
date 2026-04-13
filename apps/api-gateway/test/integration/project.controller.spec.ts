import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ProjectController } from '../../src/project/project.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ProjectController],
    providers: [{ provide: 'PROJECT_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('ProjectController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /projects/:id/kanban ──────────────────────────────────────────────

  describe('GET /projects/:id/kanban', () => {
    it('returns the kanban board for the project', async () => {
      const expected = {
        projectId: 'project-1',
        columns: [{ status: 'todo', milestones: [] }],
      };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/projects/project-1/kanban',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('get_kanban', {
        projectId: 'project-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Project not found')),
      );

      const { status } = await request(app.getHttpServer()).get(
        '/projects/missing/kanban',
      );

      expect(status).toBe(500);
    });
  });

  // ── POST /projects/milestones ─────────────────────────────────────────────

  describe('POST /projects/milestones', () => {
    const payload = {
      projectId: 'project-1',
      tenantId: 'tenant-1',
      title: 'Design mockups',
      amount: 500,
      dueDate: '2026-05-01',
    };

    it('creates a milestone and returns the result', async () => {
      const expected = { id: 'ms-1', ...payload, status: 'pending' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/projects/milestones')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('create_milestone', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Project not found')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/projects/milestones')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── PUT /projects/milestones/:id/status ───────────────────────────────────

  describe('PUT /projects/milestones/:id/status', () => {
    it('updates the milestone status', async () => {
      const expected = { id: 'ms-1', status: 'in_progress' };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .put('/projects/milestones/ms-1/status')
        .send({ status: 'in_progress' });

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('update_milestone_status', {
        milestoneId: 'ms-1',
        status: 'in_progress',
      });
    });
  });
});
