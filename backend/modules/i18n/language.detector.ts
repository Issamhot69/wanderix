import { Injectable } from '@nestjs/common';

// Langues supportées par Wanderix dès le lancement
export const SUPPORTED_LANGUAGES = [
  'en', // English
  'fr', // Français
  'ar', // العربية
  'es', // Español
  'de', // Deutsch
  'it', // Italiano
  'zh', // 中文
  'ja', // 日本語
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Langues RTL (Right-to-Left)
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

@Injectable()
export class LanguageDetector {

  /**
   * Détecte la langue depuis la requête HTTP
   * Priorité : query param → header Accept-Language → cookie → défaut
   */
  detect(request: any): SupportedLanguage {
    return (
      this.fromQueryParam(request) ||
      this.fromHeader(request) ||
      this.fromCookie(request) ||
      DEFAULT_LANGUAGE
    );
  }

  private fromQueryParam(request: any): SupportedLanguage | null {
    const lang = request.query?.lang;
    return this.validate(lang);
  }

  private fromHeader(request: any): SupportedLanguage | null {
    const header = request.headers?.['accept-language'];
    if (!header) return null;

    const languages = header
      .split(',')
      .map((part: string) => {
        const [lang, q] = part.trim().split(';q=');
        return {
          code: lang.split('-')[0].toLowerCase(),
          quality: q ? parseFloat(q) : 1.0,
        };
      })
      .sort((a: any, b: any) => b.quality - a.quality);

    for (const { code } of languages) {
      const valid = this.validate(code);
      if (valid) return valid;
    }

    return null;
  }

  private fromCookie(request: any): SupportedLanguage | null {
    const lang = request.cookies?.wanderix_lang;
    return this.validate(lang);
  }

  validate(lang: string | undefined): SupportedLanguage | null {
    if (!lang) return null;
    const normalized = lang.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage)
      ? (normalized as SupportedLanguage)
      : null;
  }

  isRTL(lang: SupportedLanguage): boolean {
    return RTL_LANGUAGES.includes(lang);
  }

  getLanguageMeta(lang: SupportedLanguage): Record<string, any> {
    const meta: Record<SupportedLanguage, object> = {
      en: { name: 'English', nativeName: 'English', rtl: false, flag: '🇬🇧' },
      fr: { name: 'French', nativeName: 'Français', rtl: false, flag: '🇫🇷' },
      ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, flag: '🇲🇦' },
      es: { name: 'Spanish', nativeName: 'Español', rtl: false, flag: '🇪🇸' },
      de: { name: 'German', nativeName: 'Deutsch', rtl: false, flag: '🇩🇪' },
      it: { name: 'Italian', nativeName: 'Italiano', rtl: false, flag: '🇮🇹' },
      zh: { name: 'Chinese', nativeName: '中文', rtl: false, flag: '🇨🇳' },
      ja: { name: 'Japanese', nativeName: '日本語', rtl: false, flag: '🇯🇵' },
    };
    return meta[lang];
  }
}