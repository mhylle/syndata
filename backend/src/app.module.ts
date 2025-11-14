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
import {
  ProjectEntity,
  DatasetEntity,
  ElementEntity,
  GenerationJobEntity,
  RecordEntity,
  ElementInstanceEntity,
  FieldValueEntity,
  AnnotationEntity,
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
  controllers: [AppController, ProjectController, DatasetController],
  providers: [AppService, ProjectService, DatasetService],
})
export class AppModule {}
