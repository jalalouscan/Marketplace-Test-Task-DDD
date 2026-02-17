import { UserRole } from './user-role.vo';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    private passwordHash: string,
    public readonly role: UserRole,
  ) {}

  getPasswordHash() {
    return this.passwordHash;
  }
}
