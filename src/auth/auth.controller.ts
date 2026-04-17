import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import type { Request, Response } from 'express';
import type { SafeUser } from '../users/users.service';

const IS_PROD = process.env.NODE_ENV === 'production';

// Shared helper — sets the httpOnly refresh token cookie
function setRefreshCookie(res: Response, token: string) {
  res.cookie('bv_refresh', token, {
    httpOnly: true,                    // JS cannot read this
    secure: IS_PROD,                   // HTTPS only in production
    sameSite: IS_PROD ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/v1/auth',              // only sent to auth endpoints
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('bv_refresh', { path: '/api/v1/auth' });
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Email + Password ───────────────────────────

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    const refreshToken = await this.authService.issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);
    return { access_token: result.access_token, user: result.user };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);
    const refreshToken = await this.authService.issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);
    return { access_token: result.access_token, user: result.user };
  }

  // ─── Token endpoint (Postman / Bruno) ──────────
  // POST /api/v1/auth/token  { "email": "...", "password": "..." }
  // Returns a 1-hour access token in JSON — pass as  token: <value>  header
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async getApiToken(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password);
    return {
      token: result.access_token,
      expires_in: 3600,
      hint: 'Pass this as  token: <value>  header in Postman / Bruno',
    };
  }

  // ─── Silent refresh (web) ───────────────────────
  // Called by the frontend at t=56min if user is active.
  // Reads httpOnly cookie, rotates it, returns new access token.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw: string | undefined = req.cookies?.['bv_refresh'];
    if (!raw) throw new UnauthorizedException('No refresh token');

    const result = await this.authService.rotateRefreshToken(raw);
    setRefreshCookie(res, result.refreshToken);
    return { access_token: result.access_token, user: result.user };
  }

  // ─── Logout ─────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() _user: SafeUser,
  ) {
    const raw: string | undefined = req.cookies?.['bv_refresh'];
    if (raw) await this.authService.revokeRefreshToken(raw);
    clearRefreshCookie(res);
    return { message: 'Logged out' };
  }

  // ─── Logout everywhere ──────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Res({ passthrough: true }) res: Response, @CurrentUser() user: SafeUser) {
    await this.authService.revokeAllRefreshTokens(user.id);
    clearRefreshCookie(res);
    return { message: 'All sessions revoked' };
  }

  // ─── Google OAuth ───────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateGoogleUser(req.user);
    const refreshToken = await this.authService.issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);

    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    res.redirect(
      `${webUrl}/login?token=${result.access_token}&user=${encodeURIComponent(
        JSON.stringify(result.user),
      )}`,
    );
  }

  // ─── Phone OTP ──────────────────────────────────

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto.phone, dto.otp);
    const refreshToken = await this.authService.issueRefreshToken(result.user.id);
    setRefreshCookie(res, refreshToken);
    return { access_token: result.access_token, user: result.user };
  }

  // ─── Forgot / Reset Password ────────────────────

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }
}
