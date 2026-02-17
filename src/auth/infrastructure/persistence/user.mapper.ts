import { User } from '../../domain/user.entity';
import { UserRole } from '../../domain/user-role.vo';
import { UserOrmEntity } from './user.orm-entity';

export class UserMapper {
  static toDomain(row: UserOrmEntity): User {
    return new User(row.id, row.email, row.password_hash, row.role as UserRole);
  }

  static toOrm(user: User): Partial<UserOrmEntity> {
    return {
      id: user.id,
      email: user.email,
      password_hash: user.getPasswordHash(),
      role: user.role,
    };
  }
}
