import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { LoggerModule } from './common/logging/logger.module';
import { HealthModule } from './core/health/health.module';
import { MigrationsModule } from './core/migrations/migrations.module';
import { ProjectController } from './features/projects/controllers/project.controller';
import { ProjectService } from './features/projects/services/project.service';
import { DatasetController } from './features/datasets/controllers/dataset.controller';
import { DatasetService } from './features/datasets/services/dataset.service';
import { UploadService } from './features/datasets/services/upload.service';
import { VersionService } from './features/datasets/services/version.service';
import { SharingService } from './features/datasets/services/sharing.service';
import { SharingController } from './features/datasets/controllers/sharing.controller';
import { GenerationController } from './features/generation/controllers/generation.controller';
import { GenerationService } from './features/generation/services/generation.service';
import { ValidationService } from './features/generation/services/validation.service';
import { PatternAnalyzerService } from './features/generation/services/pattern-analyzer.service';
import { SimpleDataGeneratorService } from './features/generation/services/simple-data-generator.service';
import { AnnotationService } from './features/generation/services/annotation.service';
import { SchemaGeneratorService } from './features/generation/services/schema-generator.service';
import { SchemaParserService } from './features/generation/services/schema-parser.service';
import { OllamaService } from './features/generation/services/ollama.service';
import { CompositeGeneratorService } from './features/generation/services/composite-generator.service';
import { CallbackService } from './features/generation/services/callback.service';
import { ExportService } from './features/generation/services/export.service';
import { TemplateService } from './features/generation/services/template.service';
import { TemplateController } from './features/generation/controllers/template.controller';
import {
  ProjectEntity,
  DatasetEntity,
  ElementEntity,
  GenerationJobEntity,
  RecordEntity,
  ElementInstanceEntity,
  FieldValueEntity,
  AnnotationEntity,
  SyntheticSchemaEntity,
  ExampleDataEntity,
  DatasetVersionEntity,
  ElementVersionEntity,
  SharedResourceEntity,
} from './shared/entities';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('environment') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([
      ProjectEntity,
      DatasetEntity,
      ElementEntity,
      GenerationJobEntity,
      RecordEntity,
      ElementInstanceEntity,
      FieldValueEntity,
      AnnotationEntity,
      SyntheticSchemaEntity,
      ExampleDataEntity,
      DatasetVersionEntity,
      ElementVersionEntity,
      SharedResourceEntity,
    ]),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl') || 60000,
          limit: configService.get<number>('rateLimit.limit') || 100,
        },
      ],
    }),
    AuthModule,
    HealthModule,
    MigrationsModule,
  ],
  controllers: [AppController, ProjectController, DatasetController, GenerationController, TemplateController, SharingController],
  providers: [
    AppService,
    ProjectService,
    DatasetService,
    UploadService,
    VersionService,
    SharingService,
    GenerationService,
    ValidationService,
    PatternAnalyzerService,
    SimpleDataGeneratorService,
    AnnotationService,
    SchemaGeneratorService,
    SchemaParserService,
    OllamaService,
    CompositeGeneratorService,
    CallbackService,
    ExportService,
    TemplateService,
  ],
})
export class AppModule {}
