import { User } from './user.entity';
import { UserRole } from './user-role.vo';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  create(params: { email: string; passwordHash: string; role: UserRole }): Promise<User>;
}
