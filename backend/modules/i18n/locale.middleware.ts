import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LanguageDetector, SupportedLanguage } from './language.detector';

// Extension du Request Express pour porter la langue
declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage;
      isRTL: boolean;
    }
  }
}

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  constructor(private readonly languageDetector: LanguageDetector) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Détecter la langue
    const language = this.languageDetector.detect(req);

    // 2. Injecter dans la requête (accessible partout dans l'app)
    req.language = language;
    req.isRTL = this.languageDetector.isRTL(language);

    // 3. Ajouter dans les headers de réponse (utile pour Flutter/React)
    res.setHeader('X-Wanderix-Language', language);
    res.setHeader('X-Wanderix-RTL', req.isRTL.toString());

    // 4. Mettre à jour le cookie si absent ou différent
    if (req.cookies?.wanderix_lang !== language) {
      res.cookie('wanderix_lang', language, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
        httpOnly: false, // accessible par Flutter/React
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    next();
  }
}