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
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // ─── Helpers ────────────────────────────────────────

  // ─── Token helpers ──────────────────────────────────

  /** Access token: 1 hour. Used by web AND Postman/Bruno. */
  private signToken(user: { id: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, role: user.role }, { expiresIn: '1h' });
  }

  /** Raw refresh token: 32 random bytes (hex string). */
  private generateRawRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  /** SHA-256 hash stored in DB — raw token never persisted. */
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Issue a new refresh token in a given family (or a new family).
   * Returns the raw token to be sent to the client as httpOnly cookie.
   */
  async issueRefreshToken(userId: string, family?: string): Promise<string> {
    const raw = this.generateRawRefreshToken();
    const tokenHash = this.hashToken(raw);
    const tokenFamily = family ?? uuidv4();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return raw;
  }

  /**
   * Validate refresh token, rotate it, detect replay attacks.
   * Returns new access token + raw refresh token.
   * Throws UnauthorizedException on any anomaly.
   */
  async rotateRefreshToken(rawToken: string): Promise<{ access_token: string; refreshToken: string; user: object }> {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Expired
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expired — please log in again');
    }

    // Replay attack: token already revoked — nuke entire family
    if (stored.isRevoked) {
      await this.prisma.refreshToken.deleteMany({ where: { family: stored.family } });
      throw new UnauthorizedException('Token reuse detected — all sessions revoked. Please log in again');
    }

    // Revoke the used token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    // Issue a new token in the same family (rotation)
    const newRaw = await this.issueRefreshToken(stored.userId, stored.family);

    const user = await this.usersService.findOne(stored.userId);
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      access_token: this.signToken(user),
      refreshToken: newRaw,
      user: {
        id: user.id, email: user.email, firstName: user.firstName,
        lastName: user.lastName, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl,
      },
    };
  }

  /** Revoke a specific refresh token on logout. */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  /** Revoke ALL refresh tokens for a user (logout everywhere). */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ─── Email + Password Registration ──────────────────

  async register(dto: RegisterDto) {
    // Check email uniqueness
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

    // Use prisma directly here — we're writing the hash, not exposing it
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
    // Need passwordHash for verification — use internal method
    const user = await this.usersService.findByEmailWithSecrets(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

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
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user && profile.email) {
      const existing = await this.usersService.findByEmailWithSecrets(profile.email);
      if (existing) {
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: existing.avatarUrl || profile.avatarUrl,
            firstName: existing.firstName || profile.firstName,
            lastName: existing.lastName || profile.lastName,
            isVerified: true,
          },
        });
      }
    }

    if (!user) {
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

  // ─── Phone OTP ─────────────────────────────────────

  async sendOtp(phone: string) {
    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpSession.create({
      data: { phone, otpHash, expiresAt, purpose: 'login' },
    });

    // DEV ONLY: log OTP to console when no SMS provider is configured
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }
    // TODO: send via WATI/MSG91 in production

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    const session = await this.prisma.otpSession.findFirst({
      where: { phone, isUsed: false, expiresAt: { gt: new Date() } },
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { access_token: this.signToken(user), user };
  }

  // ─── Forgot Password ───────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If this email exists, an OTP has been sent' };
    }

    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpSession.create({
      data: { email, otpHash, expiresAt, purpose: 'password_reset' },
    });

    await this.emailService.sendPasswordResetOtp(email, user.firstName ?? 'there', otp);

    // DEV ONLY fallback when Resend is not configured
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    }

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

    await this.prisma.otpSession.update({
      where: { id: session.id },
      data: { isUsed: true, verifiedAt: new Date() },
    });

    // Need full user to update password — use internal method
    const user = await this.usersService.findByEmailWithSecrets(email);
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
