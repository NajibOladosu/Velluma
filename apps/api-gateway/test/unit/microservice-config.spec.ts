import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { of, timer, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  getMicroserviceConfig,
  callMicroservice,
  MICROSERVICE_TIMEOUT_MS,
} from '../../src/common/utils/microservice-config';

describe('getMicroserviceConfig', () => {
  describe('default values', () => {
    it('uses localhost and 6379 when env vars are not set', () => {
      const configService = {
        get: jest.fn((key: string, defaultValue?: any) => defaultValue),
      } as unknown as ConfigService;

      const config = getMicroserviceConfig(configService);

      expect(config.transport).toBe(Transport.REDIS);
      expect((config.options as any).host).toBe('localhost');
      expect((config.options as any).port).toBe(6379);
    });

    it('reads REDIS_HOST and REDIS_PORT from env', () => {
      const configService = {
        get: jest.fn((key: string, _default?: any) => {
          if (key === 'REDIS_HOST') return 'redis.internal';
          if (key === 'REDIS_PORT') return 6380;
          return _default;
        }),
      } as unknown as ConfigService;

      const config = getMicroserviceConfig(configService);

      expect((config.options as any).host).toBe('redis.internal');
      expect((config.options as any).port).toBe(6380);
    });

    it('sets retryAttempts and retryDelay', () => {
      const configService = {
        get: jest.fn((_: string, d?: any) => d),
      } as unknown as ConfigService;

      const config = getMicroserviceConfig(configService);

      expect((config.options as any).retryAttempts).toBe(5);
      expect((config.options as any).retryDelay).toBe(3000);
    });
  });
});

describe('callMicroservice', () => {
  it('resolves with the value emitted by the observable', async () => {
    const data = { id: '1', name: 'test' };
    const result = await callMicroservice(of(data));
    expect(result).toEqual(data);
  });

  it('resolves with primitive values', async () => {
    expect(await callMicroservice(of(42))).toBe(42);
    expect(await callMicroservice(of('hello'))).toBe('hello');
    expect(await callMicroservice(of(true))).toBe(true);
  });

  it('rejects (TimeoutError) when the observable does not emit within the timeout', async () => {
    // timer(5000) will not emit within our 50ms test timeout
    const slowObs = timer(5_000).pipe(map(() => 'late'));
    await expect(callMicroservice(slowObs, 50)).rejects.toThrow();
  }, 1_000);

  it('rejects when the observable errors', async () => {
    const errObs = throwError(() => new Error('downstream error'));
    await expect(callMicroservice(errObs)).rejects.toThrow('downstream error');
  });

  it('uses MICROSERVICE_TIMEOUT_MS as the default timeout', () => {
    expect(MICROSERVICE_TIMEOUT_MS).toBe(10_000);
  });
});
