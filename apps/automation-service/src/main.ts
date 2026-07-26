import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AutomationService');

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    },
  });

  await app.startAllMicroservices();

  const healthPort = parseInt(process.env.HEALTH_PORT || '3102');
  await app.listen(healthPort);
  logger.log(
    `Automation Microservice is listening via Redis | health → :${healthPort}/health`,
  );
}
bootstrap();
