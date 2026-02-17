import {
  Body,
  Controller,
  Post,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from '../application/dtos/register.dto';
import { LoginDto } from '../application/dtos/login.dto';
import { RegisterUseCase } from '../application/use-cases/register.usecase';
import { LoginUseCase } from '../application/use-cases/login.usecase';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.registerUC.execute(dto);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'EMAIL_ALREADY_EXISTS') {
        throw new ConflictException('Email already exists');
      }
      throw e;
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUC.execute(dto);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'INVALID_CREDENTIALS') {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw e;
    }
  }
}
