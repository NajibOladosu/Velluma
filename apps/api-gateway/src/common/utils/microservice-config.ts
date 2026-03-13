import { Transport, RedisOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

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
