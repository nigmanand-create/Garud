import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { throttleFor } from '../../config/throttle.config';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthTokensResponse,
  AuthUserResponse,
  ChangePasswordDto,
  LoginDto,
  OtpRequestDto,
  OtpRequestResponse,
  OtpVerifyDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterGoogleDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import {
  applyAuthSession,
  clearAuthSession,
  readRefreshTokenFromRequest,
} from './auth-session.helper';
import { GoogleOAuthService } from './google-oauth.service';
import { OtpAuthService } from './otp-auth.service';
import { GOOGLE_PENDING_COOKIE } from './google-oauth.util';
import { AccountType } from '@prisma/client';
import { cookieBaseFromConfig } from './google-oauth-cookies.helper';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly otpAuth: OtpAuthService,
  ) {}

  @Post('register')
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({
    summary: 'Register by account type (creates user + organization)',
  })
  @ApiOkResponse({ type: AuthTokensResponse })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    return applyAuthSession({} as Request, res, this.config, tokens);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: AuthTokensResponse })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    return applyAuthSession({} as Request, res, this.config, tokens);
  }

  @Post('otp/request')
  @HttpCode(200)
  @Throttle({ default: throttleFor('otpRequest') })
  @ApiOperation({
    summary: 'Request SMS OTP for phone sign-in (India +91)',
  })
  @ApiOkResponse({ type: OtpRequestResponse })
  async requestOtp(@Body() dto: OtpRequestDto): Promise<OtpRequestResponse> {
    return this.otpAuth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({ summary: 'Verify OTP and start session (same cookies/JWT as login)' })
  @ApiOkResponse({ type: AuthTokensResponse })
  async verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.otpAuth.verifyOtpAndLogin(dto.phone, dto.code);
    return applyAuthSession({} as Request, res, this.config, tokens);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: throttleFor('authRefresh') })
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiOkResponse({ type: AuthTokensResponse })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenFromRequest(req, dto.refreshToken);
    const tokens = await this.authService.refresh({
      refreshToken: refreshToken ?? '',
    });
    return applyAuthSession(req, res, this.config, tokens);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Revoke refresh token' })
  @ApiNoContentResponse()
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readRefreshTokenFromRequest(req, dto.refreshToken);
    await this.authService.logout(user.userId, {
      refreshToken: refreshToken ?? '',
    });
    clearAuthSession(res, this.config);
  }

  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: throttleFor('auth') })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({
    summary: 'Change own password (revokes other sessions)',
  })
  @ApiOkResponse({ type: AuthUserResponse })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: AuthUserResponse })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Get('google')
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({ summary: 'Start Google OAuth (redirects to Google)' })
  googleStart(
    @Query('mode') mode: string | undefined,
    @Query('accountType') accountType: string | undefined,
    @Query('intent') intent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.googleOAuth.isConfigured()) {
      res.redirect(this.authPageUrl('/auth/login', 'oauth_not_configured'));
      return;
    }
    const flow = mode === 'register' ? 'register' : 'login';
    let parsedAccountType: AccountType | undefined;
    if (accountType && accountType in AccountType) {
      parsedAccountType = accountType as AccountType;
    }
    try {
      const url = this.googleOAuth.buildAuthorizationUrl({
        mode: flow,
        accountType: parsedAccountType,
        intent: intent?.trim() || undefined,
      });
      res.redirect(url);
    } catch {
      res.redirect(this.authPageUrl('/auth/login', 'oauth_not_configured'));
    }
  }

  @Get('google/callback')
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (oauthError || !code) {
      res.redirect(this.authPageUrl('/auth/login', oauthError || 'oauth_denied'));
      return;
    }
    if (!this.googleOAuth.isConfigured()) {
      res.redirect(this.authPageUrl('/auth/login', 'oauth_not_configured'));
      return;
    }
    const parsedState = this.googleOAuth.parseState(state);
    if (!parsedState) {
      res.redirect(this.authPageUrl('/auth/login', 'oauth_state_invalid'));
      return;
    }
    try {
      const profile = await this.googleOAuth.exchangeCode(code);
      const result = await this.authService.loginFromGoogle(profile, parsedState);
      if (result.outcome === 'error') {
        res.redirect(this.authPageUrl('/auth/login', result.code));
        return;
      }
      if (result.outcome === 'pending') {
        const token = this.googleOAuth.signPendingSignup(result.pending);
        const base = cookieBaseFromConfig(this.config);
        res.cookie(GOOGLE_PENDING_COOKIE, token, {
          ...base,
          maxAge: 10 * 60 * 1000,
        });
        res.redirect(this.authPageUrl('/auth/register/google', undefined));
        return;
      }
      applyAuthSession(req, res, this.config, result.tokens);
      res.redirect(this.authPageUrl('/auth/oauth/callback', undefined, '1'));
    } catch {
      res.redirect(this.authPageUrl('/auth/login', 'oauth_failed'));
    }
  }

  @Get('google/pending')
  @ApiOperation({ summary: 'Google signup profile from pending cookie' })
  googlePending(@Req() req: Request) {
    const token = req.cookies?.[GOOGLE_PENDING_COOKIE] as string | undefined;
    if (!token) {
      return { pending: null };
    }
    const pending = this.googleOAuth.parsePendingSignup(token);
    if (!pending) {
      return { pending: null };
    }
    return {
      pending: {
        email: pending.email,
        displayName: pending.displayName,
        accountType: pending.accountType,
      },
    };
  }

  @Post('google/complete')
  @HttpCode(200)
  @Throttle({ default: throttleFor('auth') })
  @ApiOperation({ summary: 'Complete registration after Google OAuth' })
  @ApiOkResponse({ type: AuthTokensResponse })
  async googleComplete(
    @Body() dto: RegisterGoogleDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[GOOGLE_PENDING_COOKIE] as string | undefined;
    if (!token) {
      throw new BadRequestException('Google signup session expired. Try again.');
    }
    const pending = this.googleOAuth.parsePendingSignup(token);
    if (!pending) {
      throw new BadRequestException('Google signup session expired. Try again.');
    }
    const tokens = await this.authService.registerFromGoogle(pending, dto);
    res.clearCookie(GOOGLE_PENDING_COOKIE, cookieBaseFromConfig(this.config));
    return applyAuthSession(req, res, this.config, tokens);
  }

  private authPageUrl(
    path: string,
    error?: string,
    success?: string,
  ): string {
    const base = this.config
      .get<string>('PUBLIC_APP_URL', 'http://localhost:3001')
      .replace(/\/+$/, '');
    const url = new URL(path, base);
    if (error) url.searchParams.set('error', error);
    if (success) url.searchParams.set('success', success);
    return url.toString();
  }
}
