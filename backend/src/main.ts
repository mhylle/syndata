import { NestFactory } from '@nestjs/core';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until Winston logger is ready
  });

  // Get ConfigService instance
  const configService = app.get(ConfigService);

  // Get Winston logger and set as application logger
  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable global HTTP exception filter
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Enable CORS with configuration
  const allowedOrigins =
    configService.get<string[]>('cors.allowedOrigins') || [];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('MyNotes API')
    .setDescription('API documentation for the MyNotes application')
    .setVersion('1.0')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Notes', 'Notes management endpoints')
    .addTag('Health', 'Health check endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('port') || 3000;
  const environment = configService.get<string>('environment');

  await app.listen(port);

  logger.log(
    `Application started in ${environment} mode on http://localhost:${port}`,
    'Bootstrap',
  );
  logger.log(
    `API Documentation available at http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

void bootstrap();
