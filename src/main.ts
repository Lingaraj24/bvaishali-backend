import './instrument'; // Sentry — must be first import
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse cookies — required for httpOnly refresh token
  app.use(cookieParser());

  // Security — sets recommended HTTP headers
  app.use(helmet());

  // CORS — allow Next.js frontend (port 3000) to call the API
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation — strips unknown fields, auto-transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // auto-transform primitives (string → number etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global route prefix → /api/v1/auth, /api/v1/users …
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}
bootstrap();
