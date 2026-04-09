import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService, JwtPayload } from './auth.service';

// ─────────────────────────────────────────
// Extension Request — user injecté
// ─────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        language: string;
      };
    }
  }
}

// ─────────────────────────────────────────
// Middleware Auth — vérifie le JWT
// ─────────────────────────────────────────

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = this.extractToken(req);

    if (!token) {
      // Pas de token → on continue sans user (routes publiques)
      return next();
    }

    try {
      // Vérifier et décoder le token
      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // Valider l'utilisateur en DB
      const user = await this.authService.validatePayload(payload);

      // Injecter dans la requête
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        language: user.language,
      };

      // Synchroniser la langue avec le user authentifié
      if (user.language) {
        (req as any).language = user.language;
      }

      next();

    } catch (error) {
      // Token invalide ou expiré → on continue sans user
      // Les routes protégées géreront l'erreur elles-mêmes
      next();
    }
  }

  // ─────────────────────────────────────
  // Guards de rôles (utilisés dans les controllers)
  // ─────────────────────────────────────

  static requireAuth(req: Request): void {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  static requireRole(req: Request, roles: string[]): void {
    AuthMiddleware.requireAuth(req);
    if (!roles.includes(req.user!.role)) {
      throw new UnauthorizedException(
        `Required role: ${roles.join(' or ')}`
      );
    }
  }

  static requireAdmin(req: Request): void {
    AuthMiddleware.requireRole(req, ['admin']);
  }

  static requirePartner(req: Request): void {
    AuthMiddleware.requireRole(req, ['partner', 'admin']);
  }

  static requireGuide(req: Request): void {
    AuthMiddleware.requireRole(req, ['guide', 'admin']);
  }

  // ─────────────────────────────────────
  // Extraire le token Bearer
  // ─────────────────────────────────────

  private extractToken(req: Request): string | null {
    // Header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Cookie : wanderix_token (mobile app)
    if (req.cookies?.wanderix_token) {
      return req.cookies.wanderix_token;
    }

    return null;
  }
}