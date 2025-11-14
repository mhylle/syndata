import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloWorldModule } from './hello-world/hello-world.module';
import { AuthModule } from './core/auth/auth.module';
import { LoggerModule } from './common/logging/logger.module';
import { HealthModule } from './core/health/health.module';
import { MigrationsModule } from './core/migrations/migrations.module';

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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl') || 60000,
          limit: configService.get<number>('rateLimit.limit') || 100,
        },
      ],
    }),
    HelloWorldModule,
    AuthModule,
    HealthModule,
    MigrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
