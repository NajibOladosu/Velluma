import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ---------------------------------------------------------------------------
  // CORS — restrict to declared origins only.
  //
  // Production: set ALLOWED_ORIGINS to a comma-separated list, e.g.
  //   ALLOWED_ORIGINS=https://app.velluma.com,https://velluma.vercel.app
  //
  // Development default: http://localhost:3000
  // ---------------------------------------------------------------------------
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin(
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      // No Origin header — server-to-server or same-origin request.
      // Permit in development; block in production.
      if (!requestOrigin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(
            new Error('Origin header is required in production'),
            false,
          );
        }
        return callback(null, true);
      }

      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked request from: ${requestOrigin}`);
      return callback(
        new Error(`Origin "${requestOrigin}" is not in the ALLOWED_ORIGINS list`),
        false,
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600, // cache preflight for 1 hour
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`API Gateway running on http://localhost:${port}`);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
