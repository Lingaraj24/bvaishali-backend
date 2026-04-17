import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

// Fields that must NEVER be sent to the client
const SENSITIVE_FIELDS = {
  passwordHash: true,
  otpHash: true,
  otpAttempts: true,
  otpExpiry: true,
} as const;

// Safe user shape returned in API responses
export type SafeUser = Omit<User, 'passwordHash' | 'otpHash' | 'otpAttempts' | 'otpExpiry'>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Internal use only — returns full record including passwordHash for auth checks
  async findOneWithSecrets(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmailWithSecrets(email: string): Promise<User | null> {
    if (!email) return null;
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhoneWithSecrets(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  // Safe versions — used by controllers and JWT strategy
  async findOne(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: SENSITIVE_FIELDS,
    });
  }

  async findByPhone(phone: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      omit: SENSITIVE_FIELDS,
    });
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    if (!email) return null;
    return this.prisma.user.findUnique({
      where: { email },
      omit: SENSITIVE_FIELDS,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data,
      omit: SENSITIVE_FIELDS,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      omit: SENSITIVE_FIELDS,
    });
  }
}
