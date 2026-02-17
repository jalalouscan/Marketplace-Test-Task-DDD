import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UserRepository } from '../../domain/user.repository';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('UserRepository') private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(params: { email: string; password: string }) {
    const user = await this.users.findByEmail(params.email);
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(params.password, user.getPasswordHash());
    if (!ok) throw new Error('INVALID_CREDENTIALS');

    const expiresInSec = this.config.get<number>('JWT_EXPIRES_IN_SEC') ?? 3600;

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: expiresInSec },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: `${expiresInSec}s`,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
