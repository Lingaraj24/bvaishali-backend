import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Fields that must NEVER be sent to the client
const SENSITIVE_FIELDS = {
  passwordHash: true,
} as const;

// Safe user shape returned in API responses
export type SafeUser = Omit<User, 'passwordHash'>;

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

  /**
   * Update editable profile fields (never touches phone/email).
   * Converts dateOfBirth / anniversaryDate strings to Date objects.
   */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const data: Prisma.UserUpdateInput = {};

    if (dto.salutation !== undefined)      data.salutation      = dto.salutation;
    if (dto.firstName  !== undefined)      data.firstName       = dto.firstName;
    if (dto.lastName   !== undefined)      data.lastName        = dto.lastName;
    if (dto.alternatePhone !== undefined)  data.alternatePhone  = dto.alternatePhone;
    if (dto.alternateEmail !== undefined)  data.alternateEmail  = dto.alternateEmail;
    if (dto.avatarR2Key !== undefined) {
      data.avatarR2Key = dto.avatarR2Key;
      // Derive public URL from key so existing consumers of avatarUrl still work
      const r2Public = process.env.R2_PUBLIC_URL || 'https://media.bvaishali.com';
      data.avatarUrl  = `${r2Public}/${dto.avatarR2Key}`;
    }
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.anniversaryDate !== undefined) {
      data.anniversaryDate = dto.anniversaryDate ? new Date(dto.anniversaryDate) : null;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      omit: SENSITIVE_FIELDS,
    });
  }

  /** Used by the scheduler to find users with upcoming birthdays/anniversaries */
  async findUsersWithUpcomingDate(field: 'dateOfBirth' | 'anniversaryDate', daysAhead: number) {
    // Match users whose month+day falls exactly `daysAhead` from today (any year)
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const month = target.getMonth() + 1; // 1-12
    const day   = target.getDate();

    return this.prisma.$queryRaw<Array<{
      id: string; email: string | null; phone: string | null;
      first_name: string | null; alternate_phone: string | null;
    }>>`
      SELECT id, email, phone, first_name, alternate_phone
      FROM users
      WHERE EXTRACT(MONTH FROM ${field === 'dateOfBirth' ? Prisma.sql`date_of_birth` : Prisma.sql`anniversary_date`}) = ${month}
        AND EXTRACT(DAY   FROM ${field === 'dateOfBirth' ? Prisma.sql`date_of_birth` : Prisma.sql`anniversary_date`}) = ${day}
        AND role != 'admin'
        AND deleted_at IS NULL
    `;
  }
}
