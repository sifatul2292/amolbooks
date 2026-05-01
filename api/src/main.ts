import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as express from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: true });

  // Security headers
  app.use(helmet.default({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // Gzip compression
  app.use(compression());

  // Allow Cors
  app.enableCors({
    // origin: '*',
    origin: [
      'http://localhost:4200',
      'http://localhost:42002',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3007',
      'http://localhost:3005',
      'http://localhost:3004',
      'http://localhost:3003',
      'http://localhost:3006',
      'http://localhost:3008',
      'https://www.alambook.com',
      'https://alambook.com',
      'https://admin.alambook.com',
      'https://adminsub.amolbooks.com',
      'https://uisub.amolbooks.com',
      'https://apisub.amolbooks.com',
      'https://amolbooks.com',
      'https://www.amolbooks.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,administrator',
    credentials: true,
  });
  app.use(
    '/upload/static',
    express.static(join(__dirname, '..', 'upload/static')),
  );
  // app.enableCors();
  // Version Control
  app.enableVersioning({
    type: VersioningType.URI,
  });
  // Global Prefix
  // Limit payload size
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}

bootstrap();
