import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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

  // ---------------------------------------------------------------------------
  // Swagger / OpenAPI — available at /api/docs in non-production environments
  // Set SWAGGER_ENABLED=true to expose it in production (e.g. behind auth proxy)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Velluma API')
      .setDescription(
        'API Gateway for the Velluma freelance contract-management platform.\n\n' +
        'All endpoints require a valid Supabase Bearer token in the `Authorization` header ' +
        'unless otherwise noted.\n\n' +
        '**Auth:** `Authorization: Bearer <supabase-access-token>`',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'supabase-jwt')
      .addTag('Identity', 'Tenant provisioning and Stripe Connect onboarding')
      .addTag('Contracts', 'AI contract generation and digital signing')
      .addTag('Invoices', 'Invoice lifecycle — create, list, update, send')
      .addTag('Payments', 'Escrow funding and release')
      .addTag('Proposals', 'Document generation and proposal management')
      .addTag('Projects', 'Kanban board and milestone tracking')
      .addTag('CRM', 'Client relationship management')
      .addTag('Resources', 'Project deliverable management')
      .addTag('Time', 'Time-entry logging and approval workflow')
      .addTag('Expenses', 'Expense approval and reimbursement')
      .addTag('Budget', 'Project profitability and tenant health metrics')
      .addTag('Notifications', 'Email and SMS dispatch')
      .addTag('Automation', 'Rule-based workflow automation')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`Swagger UI → http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`API Gateway running on http://localhost:${port}`);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
