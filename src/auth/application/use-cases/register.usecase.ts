import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { UserRepository } from '../../domain/user.repository';
import { UserRole } from '../../domain/user-role.vo';

@Injectable()
export class RegisterUseCase {
  constructor(@Inject('UserRepository') private readonly users: UserRepository) {}

  async execute(params: { email: string; password: string; role: UserRole }) {
    const exists = await this.users.findByEmail(params.email);
    if (exists) throw new Error('EMAIL_ALREADY_EXISTS');

    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = await this.users.create({
      email: params.email,
      passwordHash,
      role: params.role,
    });

    return { id: user.id, email: user.email, role: user.role };
  }
}
