import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ProductionAuthService } from './production-auth.service';
import { LocalAuthService } from './local-auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../shared/entities';
import { JwtStrategy, LocalStrategy } from './strategies';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiresIn') || '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ProductionAuthService,
    LocalAuthService,
    {
      provide: 'AuthService',
      useFactory: (
        configService: ConfigService,
        productionAuthService: ProductionAuthService,
        localAuthService: LocalAuthService,
      ) => {
        const authMode = configService.get<string>('auth.mode') || 'local';
        return authMode === 'production'
          ? productionAuthService
          : localAuthService;
      },
      inject: [ConfigService, ProductionAuthService, LocalAuthService],
    },
    JwtStrategy,
    LocalStrategy,
  ],
  exports: ['AuthService'],
})
export class AuthModule {}
