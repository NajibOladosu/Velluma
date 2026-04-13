import { Transport, RedisOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Observable, firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

// Default timeout for all microservice RPC calls (10 seconds).
// Without this the gateway hangs indefinitely if a downstream service is down.
export const MICROSERVICE_TIMEOUT_MS = 10_000;

export const getMicroserviceConfig = (
  configService: ConfigService,
): RedisOptions => ({
  transport: Transport.REDIS,
  options: {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    retryAttempts: 5,
    retryDelay: 3000,
  },
});

/**
 * Wraps a ClientProxy observable with a timeout so the gateway never hangs
 * indefinitely when a downstream microservice is unavailable.
 */
export async function callMicroservice<T>(
  observable: Observable<T>,
  timeoutMs = MICROSERVICE_TIMEOUT_MS,
): Promise<T> {
  return firstValueFrom(observable.pipe(timeout(timeoutMs)));
}
