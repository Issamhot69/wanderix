import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: string;
  nationality?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: string;      // 'tourist' | 'guide' | 'partner' | 'admin'
  language: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    language: string;
  };
}

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────────────────────
  // Register
  // ─────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // 1. Vérifier si l'email existe déjà
    const exists = await this.findUserByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // 3. Créer l'utilisateur en DB
    const user = await this.createUser({
      ...dto,
      password: hashedPassword,
      role: 'tourist',
      language: dto.language || 'en',
    });

    // 4. Générer les tokens
    return this.generateAuthResponse(user);
  }

  // ─────────────────────────────────────
  // Login
  // ─────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    // 1. Trouver l'utilisateur
    const user = await this.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Vérifier le mot de passe
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Générer les tokens
    return this.generateAuthResponse(user);
  }

  // ─────────────────────────────────────
  // Refresh Token
  // ─────────────────────────────────────

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.findUserById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      const accessToken = this.generateAccessToken(user);
      return { accessToken };

    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─────────────────────────────────────
  // Validate JWT Payload
  // ─────────────────────────────────────

  async validatePayload(payload: JwtPayload): Promise<any> {
    const user = await this.findUserById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  // ─────────────────────────────────────
  // OAuth (Google / Apple)
  // ─────────────────────────────────────

  async oauthLogin(profile: {
    email: string;
    firstName: string;
    lastName: string;
    provider: 'google' | 'apple';
    providerId: string;
    language?: string;
  }): Promise<AuthResponse> {
    // Chercher ou créer l'utilisateur
    let user = await this.findUserByEmail(profile.email);

    if (!user) {
      user = await this.createUser({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        password: await bcrypt.hash(Math.random().toString(36), this.SALT_ROUNDS),
        role: 'tourist',
        language: profile.language || 'en',
        provider: profile.provider,
        providerId: profile.providerId,
      });
    }

    return this.generateAuthResponse(user);
  }

  // ─────────────────────────────────────
  // Helpers privés
  // ─────────────────────────────────────

  private generateAccessToken(user: any): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      language: user.language,
    };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  private generateRefreshToken(user: any): string {
    return this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '30d',
      },
    );
  }

  private generateAuthResponse(user: any): AuthResponse {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        language: user.language,
      },
    };
  }

  // ─────────────────────────────────────
  // DB Placeholders (à connecter avec user.model)
  // ─────────────────────────────────────

  private async findUserByEmail(email: string): Promise<any> {
    // TODO: connecter avec UserModel (Prisma/TypeORM)
    return null;
  }

  private async findUserById(id: string): Promise<any> {
    // TODO: connecter avec UserModel
    return null;
  }

  private async createUser(data: any): Promise<any> {
    // TODO: connecter avec UserModel
    return { id: 'temp-id', ...data };
  }
}