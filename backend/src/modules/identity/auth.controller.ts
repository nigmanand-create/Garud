import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
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
  RefreshTokenDto,
  RegisterDto,
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
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
}
