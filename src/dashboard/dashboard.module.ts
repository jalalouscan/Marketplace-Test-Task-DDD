import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DashboardController } from './infrastructure/dashboard.controller';
import { DashboardJwtStrategy } from './infrastructure/jwt/dashboard-jwt.strategy';
import { DashboardJwtGuard } from './infrastructure/jwt/dashboard-jwt.guard';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET') ?? 'change-me-in-production',
        signOptions: {
          expiresIn: cfg.get<number>('JWT_EXPIRES_IN_SEC') ?? 3600,
        },
      }),
    }),
    AuthModule,
    ProductsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardJwtStrategy, DashboardJwtGuard],
})
export class DashboardModule {}
