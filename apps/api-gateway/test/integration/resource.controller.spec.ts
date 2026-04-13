import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ResourceController } from '../../src/resource/resource.controller';

const mockClient = { send: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ResourceController],
    providers: [{ provide: 'RESOURCE_SERVICE', useValue: mockClient }],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('ResourceController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /resources/deliverables ──────────────────────────────────────────

  describe('POST /resources/deliverables', () => {
    const payload = {
      projectId: 'project-1',
      tenantId: 'tenant-1',
      name: 'Final design file',
      description: 'Figma export',
      type: 'file',
      fileUrl: 'https://storage.example.com/file.fig',
    };

    it('adds a deliverable and returns the result', async () => {
      const expected = { id: 'd-1', ...payload };
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer())
        .post('/resources/deliverables')
        .send(payload);

      expect(status).toBe(201);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('add_deliverable', payload);
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(
        throwError(() => new Error('Project not found')),
      );

      const { status } = await request(app.getHttpServer())
        .post('/resources/deliverables')
        .send(payload);

      expect(status).toBe(500);
    });
  });

  // ── GET /resources/project/:projectId ────────────────────────────────────

  describe('GET /resources/project/:projectId', () => {
    it('returns all resources for the project', async () => {
      const expected = [
        { id: 'd-1', name: 'Final design file', type: 'file' },
        { id: 'd-2', name: 'API spec', type: 'document' },
      ];
      mockClient.send.mockReturnValue(of(expected));

      const { body, status } = await request(app.getHttpServer()).get(
        '/resources/project/project-1',
      );

      expect(status).toBe(200);
      expect(body).toEqual(expected);
      expect(mockClient.send).toHaveBeenCalledWith('list_resources', {
        projectId: 'project-1',
      });
    });

    it('returns 500 when the microservice throws', async () => {
      mockClient.send.mockReturnValue(throwError(() => new Error('DB error')));

      const { status } = await request(app.getHttpServer()).get(
        '/resources/project/project-1',
      );

      expect(status).toBe(500);
    });
  });
});
