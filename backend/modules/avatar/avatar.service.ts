import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type AvatarGender = 'male' | 'female';
export type AvatarMood = 'welcome' | 'excited' | 'informative' | 'empathetic' | 'professional';
export type AvatarLanguage = 'en' | 'fr' | 'ar' | 'es' | 'de' | 'it' | 'zh' | 'ja';

export interface AvatarProfile {
  id: string;
  gender: AvatarGender;
  name: string;
  style: 'luxury' | 'professional' | 'friendly';
  didAgentId: string;       // D-ID Agent ID
  voiceId: string;          // Voix TTS
  imageUrl: string;         // Photo de l'avatar
}

export interface AvatarChatRequest {
  message: string;
  language: AvatarLanguage;
  destination?: string;
  avatarGender: AvatarGender;
  conversationHistory?: { role: string; content: string }[];
  userId?: string;
}

export interface AvatarChatResponse {
  text: string;
  language: AvatarLanguage;
  mood: AvatarMood;
  avatar: AvatarProfile;
  didStreamUrl?: string;    // URL stream D-ID lip sync
  animation: AvatarAnimation;
}

export interface AvatarAnimation {
  type: 'idle' | 'talking' | 'walking' | 'pointing' | 'welcoming';
  position: 'center' | 'left' | 'right' | 'bottom';
  duration: number;
}

// ─────────────────────────────────────────
// Profils des avatars Wanderix
// ─────────────────────────────────────────

const AVATAR_PROFILES: Record<AvatarGender, AvatarProfile> = {
  male: {
    id: 'wanderix-guide-male',
    gender: 'male',
    name: 'Karim',
    style: 'professional',
    didAgentId: process.env.DID_MALE_AGENT_ID || 'did-male-agent',
    voiceId: process.env.DID_MALE_VOICE_ID || 'en-US-GuyNeural',
    imageUrl: 'https://assets.wanderix.com/avatars/karim.jpg',
  },
  female: {
    id: 'wanderix-guide-female',
    gender: 'female',
    name: 'Sofia',
    style: 'luxury',
    didAgentId: process.env.DID_FEMALE_AGENT_ID || 'did-female-agent',
    voiceId: process.env.DID_FEMALE_VOICE_ID || 'en-US-JennyNeural',
    imageUrl: 'https://assets.wanderix.com/avatars/sofia.jpg',
  },
};

// ─────────────────────────────────────────
// Noms des avatars par langue
// ─────────────────────────────────────────

const AVATAR_NAMES: Record<AvatarGender, Record<AvatarLanguage, string>> = {
  male: {
    en: 'Karim', fr: 'Karim', ar: 'كريم',
    es: 'Karim', de: 'Karim', it: 'Karim',
    zh: '卡里姆', ja: 'カリム',
  },
  female: {
    en: 'Sofia', fr: 'Sofia', ar: 'صوفيا',
    es: 'Sofia', de: 'Sofia', it: 'Sofia',
    zh: '索菲亚', ja: 'ソフィア',
  },
};

// ─────────────────────────────────────────
// System Prompts par avatar
// ─────────────────────────────────────────

const AVATAR_SYSTEM_PROMPTS: Record<AvatarGender, Record<AvatarLanguage, string>> = {
  male: {
    en: `You are Karim, Wanderix's expert male travel guide. You are charming, professional, and knowledgeable. You speak with confidence and warmth. Keep responses concise (2-3 sentences max) for voice output.`,
    fr: `Tu es Karim, le guide de voyage masculin expert de Wanderix. Tu es charmant, professionnel et cultivé. Parle avec confiance et chaleur. Garde tes réponses concises (2-3 phrases max) pour la voix.`,
    ar: `أنت كريم، مرشد السفر الذكر الخبير في Wanderix. أنت ساحر ومحترف ومثقف. تحدث بثقة ودفء. اجعل إجاباتك موجزة (2-3 جمل كحد أقصى) للصوت.`,
    es: `Eres Karim, el guía de viaje masculino experto de Wanderix. Eres encantador, profesional y culto. Habla con confianza y calidez. Mantén las respuestas concisas (máx 2-3 frases) para la voz.`,
    de: `Du bist Karim, Wanderix's erfahrener männlicher Reiseführer. Du bist charmant, professionell und gebildet. Sprich mit Zuversicht und Wärme. Halte Antworten kurz (max 2-3 Sätze) für die Sprachausgabe.`,
    it: `Sei Karim, la guida turistica maschile esperta di Wanderix. Sei affascinante, professionale e colto. Parla con fiducia e calore. Mantieni le risposte concise (max 2-3 frasi) per la voce.`,
    zh: `你是卡里姆，Wanderix的专业男性旅游向导。你迷人、专业、博学。用自信和温暖说话。保持回答简洁（最多2-3句话）以便语音输出。`,
    ja: `あなたはカリム、Wanderixの専門男性旅行ガイドです。魅力的でプロフェッショナルで博識です。自信と温かさで話してください。音声出力のため、回答は簡潔に（最大2〜3文）してください。`,
  },
  female: {
    en: `You are Sofia, Wanderix's luxury female travel guide. You are elegant, sophisticated, and passionate about travel. You speak with grace and enthusiasm. Keep responses concise (2-3 sentences max) for voice output.`,
    fr: `Tu es Sofia, la guide de voyage féminine luxe de Wanderix. Tu es élégante, sophistiquée et passionnée de voyage. Parle avec grâce et enthousiasme. Garde tes réponses concises (2-3 phrases max) pour la voix.`,
    ar: `أنت صوفيا، مرشدة السفر الأنثى الفاخرة في Wanderix. أنت أنيقة ومتطورة وشغوفة بالسفر. تحدثي بأناقة وحماس. اجعلي إجاباتك موجزة (2-3 جمل كحد أقصى) للصوت.`,
    es: `Eres Sofia, la guía de viaje femenina de lujo de Wanderix. Eres elegante, sofisticada y apasionada por los viajes. Habla con gracia y entusiasmo. Mantén las respuestas concisas (máx 2-3 frases) para la voz.`,
    de: `Du bist Sofia, Wanderix's luxuriöse weibliche Reiseführerin. Du bist elegant, anspruchsvoll und reisebegeistert. Sprich mit Anmut und Begeisterung. Halte Antworten kurz (max 2-3 Sätze) für die Sprachausgabe.`,
    it: `Sei Sofia, la guida turistica femminile di lusso di Wanderix. Sei elegante, sofisticata e appassionata di viaggi. Parla con grazia ed entusiasmo. Mantieni le risposte concise (max 2-3 frasi) per la voce.`,
    zh: `你是索菲亚，Wanderix的豪华女性旅游向导。你优雅、精致、对旅行充满热情。优雅而热情地说话。保持回答简洁（最多2-3句话）以便语音输出。`,
    ja: `あなたはソフィア、Wanderixの高級女性旅行ガイドです。エレガントで洗練されており、旅行への情熱があります。優雅さと熱意を持って話してください。音声出力のため、回答は簡潔に（最大2〜3文）してください。`,
  },
};

// ─────────────────────────────────────────
// Service Avatar
// ─────────────────────────────────────────

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  constructor(private readonly aiService: AiService) {}

  // ─────────────────────────────────────
  // Chat avec l'avatar
  // ─────────────────────────────────────

  async chat(req: AvatarChatRequest): Promise<AvatarChatResponse> {
    try {
      const avatar = AVATAR_PROFILES[req.avatarGender];
      const systemPrompt = AVATAR_SYSTEM_PROMPTS[req.avatarGender][req.language];

      // 1. Appeler Claude via AI Engine
      const aiResult = await this.aiService.chat({
        message: req.message,
        destination: req.destination || 'the world',
        language: req.language,
        conversationHistory: req.conversationHistory,
      });

      // 2. Détecter le mood selon la réponse
      const mood = this.detectMood(aiResult.reply);

      // 3. Calculer l'animation
      const animation = this.calculateAnimation(mood, req.message);

      // 4. Générer le lip sync D-ID (si clé disponible)
      const didStreamUrl = await this.generateDIDStream(
        aiResult.reply,
        avatar,
        req.language,
      );

      return {
        text: aiResult.reply,
        language: req.language,
        mood,
        avatar: {
          ...avatar,
          name: AVATAR_NAMES[req.avatarGender][req.language],
        },
        didStreamUrl,
        animation,
      };

    } catch (error) {
      this.logger.error('avatar chat failed: ' + error.message);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Message de bienvenue
  // ─────────────────────────────────────

  async getWelcomeMessage(
    language: AvatarLanguage,
    avatarGender: AvatarGender,
    destination?: string,
  ): Promise<AvatarChatResponse> {
    const welcomeMessages: Record<AvatarLanguage, string> = {
      en: destination
        ? `Welcome to ${destination}! I'm your personal guide. How can I help you today?`
        : `Welcome to Wanderix! I'm your AI travel companion. Where would you like to go?`,
      fr: destination
        ? `Bienvenue à ${destination}! Je suis votre guide personnel. Comment puis-je vous aider?`
        : `Bienvenue sur Wanderix! Je suis votre compagnon de voyage IA. Où souhaitez-vous aller?`,
      ar: destination
        ? `مرحباً بك في ${destination}! أنا دليلك الشخصي. كيف يمكنني مساعدتك؟`
        : `مرحباً بك في Wanderix! أنا رفيق سفرك الذكي. إلى أين تريد الذهاب؟`,
      es: destination
        ? `¡Bienvenido a ${destination}! Soy tu guía personal. ¿Cómo puedo ayudarte?`
        : `¡Bienvenido a Wanderix! Soy tu compañero de viaje IA. ¿A dónde te gustaría ir?`,
      de: destination
        ? `Willkommen in ${destination}! Ich bin Ihr persönlicher Guide. Wie kann ich helfen?`
        : `Willkommen bei Wanderix! Ich bin Ihr KI-Reisebegleiter. Wohin möchten Sie reisen?`,
      it: destination
        ? `Benvenuto a ${destination}! Sono la tua guida personale. Come posso aiutarti?`
        : `Benvenuto su Wanderix! Sono il tuo compagno di viaggio IA. Dove vorresti andare?`,
      zh: destination
        ? `欢迎来到${destination}！我是您的私人向导。我能帮您什么？`
        : `欢迎来到Wanderix！我是您的AI旅行伴侣。您想去哪里？`,
      ja: destination
        ? `${destination}へようこそ！私はあなたのパーソナルガイドです。何かお手伝いできますか？`
        : `Wanderixへようこそ！私はあなたのAI旅行コンパニオンです。どこに行きたいですか？`,
    };

    const avatar = AVATAR_PROFILES[avatarGender];

    return {
      text: welcomeMessages[language],
      language,
      mood: 'welcome',
      avatar: {
        ...avatar,
        name: AVATAR_NAMES[avatarGender][language],
      },
      animation: {
        type: 'welcoming',
        position: 'center',
        duration: 3000,
      },
    };
  }

  // ─────────────────────────────────────
  // Profils disponibles
  // ─────────────────────────────────────

  getProfiles(): Record<AvatarGender, AvatarProfile> {
    return AVATAR_PROFILES;
  }

  // ─────────────────────────────────────
  // Helpers privés
  // ─────────────────────────────────────

  private detectMood(text: string): AvatarMood {
    const lower = text.toLowerCase();
    if (lower.includes('welcome') || lower.includes('bienvenue') || lower.includes('مرحب')) {
      return 'welcome';
    }
    if (lower.includes('amazing') || lower.includes('wonderful') || lower.includes('magnifique')) {
      return 'excited';
    }
    if (lower.includes('sorry') || lower.includes('unfortunately') || lower.includes('désolé')) {
      return 'empathetic';
    }
    if (lower.includes('hotel') || lower.includes('flight') || lower.includes('booking')) {
      return 'professional';
    }
    return 'informative';
  }

  private calculateAnimation(mood: AvatarMood, message: string): AvatarAnimation {
    const animations: Record<AvatarMood, AvatarAnimation> = {
      welcome: { type: 'welcoming', position: 'center', duration: 3000 },
      excited: { type: 'talking', position: 'center', duration: 2000 },
      informative: { type: 'pointing', position: 'right', duration: 2500 },
      empathetic: { type: 'idle', position: 'left', duration: 2000 },
      professional: { type: 'talking', position: 'center', duration: 2000 },
    };
    return animations[mood];
  }

  private async generateDIDStream(
    text: string,
    avatar: AvatarProfile,
    language: AvatarLanguage,
  ): Promise<string | undefined> {
    try {
      if (!process.env.DID_API_KEY) return undefined;

      // TODO: appel API D-ID pour lip sync
      // const response = await axios.post('https://api.d-id.com/talks', {
      //   script: { type: 'text', input: text, provider: { type: 'microsoft', voice_id: avatar.voiceId } },
      //   source_url: avatar.imageUrl,
      // }, { headers: { Authorization: 'Basic ' + process.env.DID_API_KEY } });
      // return response.data.result_url;

      return undefined;

    } catch (error) {
      this.logger.warn('D-ID stream failed: ' + error.message);
      return undefined;
    }
  }
}