import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { SupportedLanguage, DEFAULT_LANGUAGE } from './language.detector';

// Traductions humaines vérifiées — contenu critique
const VERIFIED_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  'booking.confirmed': {
    en: 'Your booking is confirmed!',
    fr: 'Votre réservation est confirmée !',
    ar: 'تم تأكيد حجزك!',
    es: '¡Tu reserva está confirmada!',
    de: 'Ihre Buchung ist bestätigt!',
    it: 'La tua prenotazione è confermata!',
    zh: '您的预订已确认！',
    ja: 'ご予約が確定しました！',
  },
  'booking.cancelled': {
    en: 'Your booking has been cancelled.',
    fr: 'Votre réservation a été annulée.',
    ar: 'تم إلغاء حجزك.',
    es: 'Tu reserva ha sido cancelada.',
    de: 'Ihre Buchung wurde storniert.',
    it: 'La tua prenotazione è stata annullata.',
    zh: '您的预订已取消。',
    ja: 'ご予約がキャンセルされました。',
  },
  'payment.success': {
    en: 'Payment successful!',
    fr: 'Paiement réussi !',
    ar: 'تمت عملية الدفع بنجاح!',
    es: '¡Pago exitoso!',
    de: 'Zahlung erfolgreich!',
    it: 'Pagamento riuscito!',
    zh: '付款成功！',
    ja: 'お支払いが完了しました！',
  },
  'payment.failed': {
    en: 'Payment failed. Please try again.',
    fr: 'Échec du paiement. Veuillez réessayer.',
    ar: 'فشل الدفع. يرجى المحاولة مرة أخرى.',
    es: 'Pago fallido. Por favor, inténtalo de nuevo.',
    de: 'Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.',
    it: 'Pagamento fallito. Per favore riprova.',
    zh: '付款失败，请重试。',
    ja: 'お支払いに失敗しました。もう一度お試しください。',
  },
  'error.generic': {
    en: 'Something went wrong. Please try again.',
    fr: 'Une erreur est survenue. Veuillez réessayer.',
    ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    es: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    it: 'Qualcosa è andato storto. Per favore riprova.',
    zh: '出现错误，请重试。',
    ja: 'エラーが発生しました。もう一度お試しください。',
  },
};

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly anthropic: Anthropic;
  private readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 jours en secondes

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Point d'entrée principal
   * Priorité : traduction humaine vérifiée → cache Redis → Claude API
   */
  async translate(
    text: string,
    targetLang: SupportedLanguage,
    context?: string, // ex: "hotel description", "itinerary step", "legal contract"
  ): Promise<string> {
    // Même langue → pas besoin de traduire
    if (targetLang === DEFAULT_LANGUAGE && !context) return text;

    // 1. Vérifier les traductions humaines d'abord
    const verified = this.getVerifiedTranslation(text, targetLang);
    if (verified) return verified;

    // 2. Vérifier le cache Redis
    const cacheKey = this.buildCacheKey(text, targetLang, context);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    // 3. Appeler Claude API
    const translated = await this.translateWithClaude(text, targetLang, context);

    // 4. Sauvegarder dans Redis
    await this.saveToCache(cacheKey, translated);

    return translated;
  }

  /**
   * Traduire un objet entier (ex: description hôtel avec plusieurs champs)
   */
  async translateObject(
    obj: Record<string, string>,
    targetLang: SupportedLanguage,
    context?: string,
  ): Promise<Record<string, string>> {
    const entries = Object.entries(obj);
    const translated = await Promise.all(
      entries.map(async ([key, value]) => [
        key,
        await this.translate(value, targetLang, context),
      ]),
    );
    return Object.fromEntries(translated);
  }

  /**
   * Traduction via Claude — intelligent et contextuel
   */
  private async translateWithClaude(
    text: string,
    targetLang: SupportedLanguage,
    context?: string,
  ): Promise<string> {
    try {
      const systemPrompt = `You are Wanderix's expert travel content translator.
Your translations must be:
- Natural and culturally appropriate (not literal)
- Travel/tourism industry specific
- Consistent with the Wanderix brand tone (friendly, professional, inspiring)
- Accurate for ${context ? `the context: "${context}"` : 'general travel content'}

Return ONLY the translated text, nothing else. No explanations, no quotes.`;

      const userPrompt = `Translate this text to ${this.getLanguageName(targetLang)}:\n\n${text}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      });

      const translated = response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : text;

      return translated;

    } catch (error) {
      this.logger.error(`Claude translation failed: ${error.message}`);
      // Fallback : retourner le texte original
      return text;
    }
  }

  /**
   * Vérifier si une traduction humaine existe
   */
  private getVerifiedTranslation(
    key: string,
    lang: SupportedLanguage,
  ): string | null {
    const translations = VERIFIED_TRANSLATIONS[key];
    if (!translations) return null;
    return translations[lang] || translations[DEFAULT_LANGUAGE] || null;
  }

  /**
   * Cache Redis
   */
  private buildCacheKey(
    text: string,
    lang: SupportedLanguage,
    context?: string,
  ): string {
    const hash = Buffer.from(text).toString('base64').slice(0, 32);
    return `wanderix:i18n:${lang}:${context || 'general'}:${hash}`;
  }

  private async getFromCache(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async saveToCache(key: string, value: string): Promise<void> {
    try {
      await this.redis.setex(key, this.CACHE_TTL, value);
    } catch (error) {
      this.logger.warn(`Redis cache save failed: ${error.message}`);
    }
  }

  private getLanguageName(lang: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      en: 'English',
      fr: 'French',
      ar: 'Arabic',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
    };
    return names[lang];
  }
}