import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip in development — Turnstile is a production bot-protection measure
    if (this.config.get('NODE_ENV') !== 'production') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { ip?: string; headers: Record<string, string> }>();
    const token = request.headers['x-turnstile-token'];

    if (!token) {
      throw new ForbiddenException('Bot verification token missing');
    }

    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      this.logger.warn('TURNSTILE_SECRET_KEY not set — skipping verification');
      return true;
    }

    try {
      const body = new URLSearchParams({ secret, response: token });
      // Attach client IP if available (improves Cloudflare accuracy)
      const ip = (request as any).ip;
      if (ip) body.set('remoteip', ip);

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
      });

      const data: { success: boolean; 'error-codes'?: string[] } = await res.json();

      if (!data.success) {
        this.logger.warn('Turnstile verification failed', data['error-codes']);
        throw new ForbiddenException('Bot verification failed');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // If Cloudflare is unreachable, fail open with a warning (don't block real users)
      this.logger.error('Turnstile verification request failed', err);
      return true;
    }
  }
}
