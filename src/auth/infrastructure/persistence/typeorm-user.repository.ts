import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRepository } from '../../domain/user.repository';
import { User } from '../../domain/user.entity';
import { UserRole } from '../../domain/user-role.vo';
import { UserOrmEntity } from './user.orm-entity';
import { UserMapper } from './user.mapper';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.repo.save(UserMapper.toOrm(user));
  }

  async create(params: {
    email: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<User> {
    const row = this.repo.create({
      email: params.email,
      password_hash: params.passwordHash,
      role: params.role,
    });

    const saved = await this.repo.save(row);
    return UserMapper.toDomain(saved);
  }
}
