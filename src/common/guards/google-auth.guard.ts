import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Custom Google OAuth guard.
 *
 * The default AuthGuard('google') lets raw passport/OAuth errors bubble up
 * as uncaught non-HttpExceptions, which NestJS converts to opaque 500s.
 * This guard catches them and throws a proper UnauthorizedException instead.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err: any) {
      const message =
        err?.message === 'access_denied'
          ? 'Google sign-in was cancelled'
          : 'Google authentication failed';
      throw new UnauthorizedException(message);
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const message =
        err?.message === 'access_denied'
          ? 'Google sign-in was cancelled'
          : (info?.message ?? err?.message ?? 'Google authentication failed');
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
