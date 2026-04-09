import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Wanderix');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // ─────────────────────────────────────
  // Middleware
  // ─────────────────────────────────────
  app.use(cookieParser());

  // ─────────────────────────────────────
  // CORS
  // ─────────────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:4000',  // Admin Dashboard
      'http://localhost:4001',  // Partner Portal
      'http://localhost:3000',  // Backend
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // ─────────────────────────────────────
  // Global Prefix
  // ─────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─────────────────────────────────────
  // Port
  // ─────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Wanderix Backend running on http://localhost:${port}/api/v1`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV}`);
}

bootstrap();