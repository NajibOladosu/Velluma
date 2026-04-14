import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok status with service name and timestamp', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('contract-service');
      expect(result.timestamp).toBeDefined();
    });
  });
});
