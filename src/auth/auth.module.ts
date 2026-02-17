import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { AuthController } from './infrastructure/auth.controller';
import { JwtStrategy } from './infrastructure/jwt/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/jwt/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET') ?? 'change-me-in-production',
        signOptions: {
          expiresIn: cfg.get<number>('JWT_EXPIRES_IN_SEC') ?? 3600,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: 'UserRepository', useClass: TypeOrmUserRepository },
    RegisterUseCase,
    LoginUseCase,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: ['UserRepository', JwtAuthGuard, LoginUseCase],
})
export class AuthModule {}
