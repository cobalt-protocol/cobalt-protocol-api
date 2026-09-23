import './common/utils/bigint.util.js';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should serialize BigInt without throwing error', () => {
      const data = { winner_id: 1234567890123456789n };
      expect(() => JSON.stringify(data)).not.toThrow();
      expect(JSON.stringify(data)).toBe('{"winner_id":"1234567890123456789"}');
    });
  });
});

