import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface ItineraryRequest {
  destination: string;
  language?: string;
  nationality?: string;
  travelStyle?: string;
  interests?: string[];
  budget?: string;
  tripDuration?: number;
  groupType?: string;
}

export interface HotelRecommendationRequest {
  destination: string;
  hotels: Record<string, any>[];
  language?: string;
  travelStyle?: string;
  budget?: string;
  groupType?: string;
}

export interface GuideMatchRequest {
  destination: string;
  guides: Record<string, any>[];
  language?: string;
  interests?: string[];
  travelStyle?: string;
}

export interface ChatRequest {
  message: string;
  destination: string;
  language?: string;
  conversationHistory?: { role: string; content: string }[];
  nationality?: string;
  travelStyle?: string;
  interests?: string[];
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  context?: string;
}

export interface BatchTranslationRequest {
  texts: string[];
  targetLanguage: string;
  context?: string;
}

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.AI_ENGINE_URL || 'http://localhost:8000',
      timeout: 30000, // 30s — Claude peut prendre du temps
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY,
      },
    });

    // Log chaque requête vers l'AI Engine
    this.http.interceptors.request.use((config) => {
      this.logger.log(`→ AI Engine: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Log chaque réponse
    this.http.interceptors.response.use(
      (response) => {
        this.logger.log(`← AI Engine: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`← AI Engine Error: ${error.message}`);
        throw error;
      },
    );
  }

  // ─────────────────────────────────────
  // Itinéraire
  // ─────────────────────────────────────

  async generateItinerary(req: ItineraryRequest): Promise<{
    destination: string;
    language: string;
    itinerary: string;
  }> {
    try {
      const { data } = await this.http.post('/ai/itinerary', {
        destination: req.destination,
        language: req.language || 'en',
        nationality: req.nationality,
        travel_style: req.travelStyle,
        interests: req.interests,
        budget: req.budget,
        trip_duration: req.tripDuration,
        group_type: req.groupType,
      });
      return data;
    } catch (error) {
      this.logger.error(`generateItinerary failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Recommandation Hôtels
  // ─────────────────────────────────────

  async recommendHotels(req: HotelRecommendationRequest): Promise<{
    destination: string;
    language: string;
    recommendations: string;
  }> {
    try {
      const { data } = await this.http.post('/ai/hotels/recommend', {
        destination: req.destination,
        hotels: req.hotels,
        language: req.language || 'en',
        travel_style: req.travelStyle,
        budget: req.budget,
        group_type: req.groupType,
      });
      return data;
    } catch (error) {
      this.logger.error(`recommendHotels failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Matching Guide
  // ─────────────────────────────────────

  async matchGuide(req: GuideMatchRequest): Promise<{
    destination: string;
    language: string;
    match: string;
  }> {
    try {
      const { data } = await this.http.post('/ai/guides/match', {
        destination: req.destination,
        guides: req.guides,
        language: req.language || 'en',
        interests: req.interests,
        travel_style: req.travelStyle,
      });
      return data;
    } catch (error) {
      this.logger.error(`matchGuide failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Chat IA temps réel
  // ─────────────────────────────────────

  async chat(req: ChatRequest): Promise<{
    language: string;
    reply: string;
  }> {
    try {
      const { data } = await this.http.post('/ai/chat', {
        message: req.message,
        destination: req.destination,
        language: req.language || 'en',
        conversation_history: req.conversationHistory,
        nationality: req.nationality,
        travel_style: req.travelStyle,
        interests: req.interests,
      });
      return data;
    } catch (error) {
      this.logger.error(`chat failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Traduction
  // ─────────────────────────────────────

  async translate(req: TranslationRequest): Promise<string> {
    try {
      const { data } = await this.http.post('/ai/translate', {
        text: req.text,
        target_language: req.targetLanguage,
        context: req.context,
      });
      return data.translated;
    } catch (error) {
      this.logger.error(`translate failed: ${error.message}`);
      return req.text; // Fallback : texte original
    }
  }

  async translateBatch(req: BatchTranslationRequest): Promise<string[]> {
    try {
      const { data } = await this.http.post('/ai/translate/batch', {
        texts: req.texts,
        target_language: req.targetLanguage,
        context: req.context,
      });
      return data.translations;
    } catch (error) {
      this.logger.error(`translateBatch failed: ${error.message}`);
      return req.texts; // Fallback : textes originaux
    }
  }

  // ─────────────────────────────────────
  // Health check
  // ─────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      const { data } = await this.http.get('/health');
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}