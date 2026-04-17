import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // ─── Helpers ────────────────────────────────────────

  private signToken(user: { id: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, role: user.role });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ─── Email + Password Registration ──────────────────

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Check phone uniqueness if provided
    if (dto.phone) {
      const existingPhone = await this.usersService.findByPhone(dto.phone);
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || null,
        authProvider: 'email',
        isVerified: false,
      },
    });

    return {
      access_token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ─── Email + Password Login ─────────────────────────

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ─── Google OAuth ───────────────────────────────────

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }) {
    // Try to find by googleId first
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user && profile.email) {
      // Check if email already exists (user registered via email)
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: user.avatarUrl || profile.avatarUrl,
            firstName: user.firstName || profile.firstName,
            lastName: user.lastName || profile.lastName,
            isVerified: true,
          },
        });
      }
    }

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          authProvider: 'google',
          isVerified: true,
        },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ─── Phone OTP (existing) ──────────────────────────

  async sendOtp(phone: string) {
    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpSession.create({
      data: {
        phone,
        otpHash,
        expiresAt,
        purpose: 'login',
      },
    });

    console.log(`[DEV ONLY] OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent successfully (Check server logs in dev mode)' };
  }

  async verifyOtp(phone: string, otp: string) {
    const session = await this.prisma.otpSession.findFirst({
      where: {
        phone,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isValid = await argon2.verify(session.otpHash, otp);
    if (!isValid) {
      await this.prisma.otpSession.update({
        where: { id: session.id },
        data: { attemptCount: session.attemptCount + 1 },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { isUsed: true, verifiedAt: new Date() },
    });

    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({ phone });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.signToken(user),
      user,
    };
  }

  // ─── Forgot Password ───────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists — return success anyway
      return { message: 'If this email exists, an OTP has been sent' };
    }

    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.prisma.otpSession.create({
      data: {
        email,
        otpHash,
        expiresAt,
        purpose: 'password_reset',
      },
    });

    // Send OTP via Resend; also log in dev for quick testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    }
    await this.emailService.sendPasswordResetOtp(
      email,
      user.firstName ?? 'there',
      otp,
    );

    return { message: 'If this email exists, an OTP has been sent' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const session = await this.prisma.otpSession.findFirst({
      where: {
        email,
        purpose: 'password_reset',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isValid = await argon2.verify(session.otpHash, otp);
    if (!isValid) {
      await this.prisma.otpSession.update({
        where: { id: session.id },
        data: { attemptCount: session.attemptCount + 1 },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used
    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { isUsed: true, verifiedAt: new Date() },
    });

    // Update password
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully. Please log in.' };
  }
}
