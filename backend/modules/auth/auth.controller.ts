import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto, AuthResponse } from './auth.service';
import { Request } from 'express';

// ─────────────────────────────────────────
// DTOs Validation
// ─────────────────────────────────────────

class RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: string;
  nationality?: string;
}

class LoginBody {
  email: string;
  password: string;
}

class RefreshBody {
  refreshToken: string;
}

class OAuthBody {
  email: string;
  firstName: string;
  lastName: string;
  provider: 'google' | 'apple';
  providerId: string;
  language?: string;
}

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────
  // POST /auth/register
  // ─────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterBody,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    // Récupérer la langue détectée par LocaleMiddleware
    const language = body.language || (req as any).language || 'en';

    return this.authService.register({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      language,
      nationality: body.nationality,
    });
  }

  // ─────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginBody): Promise<AuthResponse> {
    return this.authService.login({
      email: body.email,
      password: body.password,
    });
  }

  // ─────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshBody,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(body.refreshToken);
  }

  // ─────────────────────────────────────
  // POST /auth/oauth
  // ─────────────────────────────────────

  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  async oauth(
    @Body() body: OAuthBody,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const language = body.language || (req as any).language || 'en';

    return this.authService.oauthLogin({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      provider: body.provider,
      providerId: body.providerId,
      language,
    });
  }

  // ─────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: Request): Promise<any> {
    const user = (req as any).user;
    if (!user) {
      return { error: 'Not authenticated' };
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      language: user.language,
    };
  }

  // ─────────────────────────────────────
  // GET /auth/health
  // ─────────────────────────────────────

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): { status: string } {
    return { status: 'auth module ok' };
  }
}