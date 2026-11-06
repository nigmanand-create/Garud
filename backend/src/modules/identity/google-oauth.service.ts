import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import type { AccountType } from '@prisma/client';
import {
  decodeGoogleOAuthState,
  encodeGoogleOAuthState,
  encodeGooglePending,
  decodeGooglePending,
  googleCallbackUrl,
  type GoogleOAuthState,
  type GooglePendingPayload,
} from './google-oauth.util';

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
};

@Injectable()
export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;

  constructor(private readonly config: ConfigService) {
    const clientId = config.get<string>('GOOGLE_OAUTH_CLIENT_ID')?.trim();
    const clientSecret = config
      .get<string>('GOOGLE_OAUTH_CLIENT_SECRET')
      ?.trim();
    if (clientId && clientSecret) {
      this.client = new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri: googleCallbackUrl(
          config.get<string>('PUBLIC_APP_URL', 'http://localhost:3001'),
        ),
      });
    } else {
      this.client = null;
    }
  }

  isConfigured(): boolean {
    if (!this.client) return false;
    return Boolean(this.config.get<string>('JWT_ACCESS_SECRET')?.trim());
  }

  buildAuthorizationUrl(params: {
    mode: 'login' | 'register';
    accountType?: AccountType;
    intent?: string;
  }): string {
    if (!this.client) {
      throw new Error('Google OAuth is not configured');
    }
    const secret = this.stateSecret();
    const state = encodeGoogleOAuthState(
      {
        mode: params.mode,
        accountType: params.accountType,
        intent: params.intent,
        nonce: randomBytes(12).toString('hex'),
      },
      secret,
    );
    return this.client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });
  }

  parseState(state: string | undefined): GoogleOAuthState | null {
    if (!state) return null;
    return decodeGoogleOAuthState(state, this.stateSecret());
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    if (!this.client) {
      throw new Error('Google OAuth is not configured');
    }
    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token) {
      throw new Error('Missing id_token from Google');
    }
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Incomplete Google profile');
    }
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      displayName: payload.name?.trim() || payload.email.split('@')[0] || 'User',
    };
  }

  private stateSecret(): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    return secret;
  }

  signPendingSignup(data: GooglePendingPayload): string {
    return encodeGooglePending(data, this.stateSecret());
  }

  parsePendingSignup(token: string): GooglePendingPayload | null {
    return decodeGooglePending(token, this.stateSecret());
  }
}
