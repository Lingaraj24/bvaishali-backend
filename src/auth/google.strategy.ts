import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    console.log(`[AUTH] Google Client ID loaded: ${!!clientID} (Length: ${clientID?.length})`);
    console.log(`[AUTH] Google Client Secret loaded: ${!!clientSecret} (Length: ${clientSecret?.length})`);

    super({
      clientID: clientID!,
      clientSecret: clientSecret!,
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const { id, name, emails, photos } = profile;
      this.logger.log(`Google profile received: id=${id} email=${emails?.[0]?.value}`);
      const user = {
        googleId: id,
        email: emails?.[0]?.value,
        firstName: name?.givenName,
        lastName: name?.familyName,
        avatarUrl: photos?.[0]?.value,
      };
      done(null, user);
    } catch (err: any) {
      this.logger.error('Google validate error', err?.stack ?? err?.message ?? err);
      done(err, false);
    }
  }
}
