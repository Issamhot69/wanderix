import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import {
  GuideModel,
  GuideResponse,
  GuideFilterDto,
  localizeGuide,
} from './guide.model';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface MatchInput {
  destination: string;
  language: string;
  interests?: string[];
  travelStyle?: string;
  budget?: string;
  groupType?: string;
}

export interface MatchResult {
  guide: GuideResponse;
  matchScore: number;
  matchReasons: string[];
  aiRecommendation: string;
}

// ─────────────────────────────────────────
// Guide Matcher
// ─────────────────────────────────────────

@Injectable()
export class GuideMatcher {
  private readonly logger = new Logger(GuideMatcher.name);

  constructor(
    private readonly aiService: AiService,
  ) {}

  // ─────────────────────────────────────
  // Trouver le meilleur guide
  // ─────────────────────────────────────

  async findBestMatch(input: MatchInput): Promise<MatchResult | null> {
    try {
      // 1. Récupérer les guides disponibles
      const guides = await this.getAvailableGuides({
        destinationId: input.destination,
        languages: [input.language],
        language: input.language,
      });

      if (!guides.length) {
        this.logger.warn(`No guides found for ${input.destination}`);
        return null;
      }

      // 2. Scorer chaque guide
      const scored = guides.map((guide) => ({
        guide,
        score: this.calculateScore(guide, input),
        reasons: this.getMatchReasons(guide, input),
      }));

      // 3. Trier par score
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      // 4. Obtenir la recommandation IA
      const guidesData = guides.map((g) => ({
        name: g.bio.slice(0, 50),
        languages: g.languages,
        specialty: g.specialty,
        rating: g.rating,
      }));

      const aiResult = await this.aiService.matchGuide({
        destination: input.destination,
        guides: guidesData,
        language: input.language,
        interests: input.interests,
        travelStyle: input.travelStyle,
      });

      return {
        guide: best.guide,
        matchScore: best.score,
        matchReasons: best.reasons,
        aiRecommendation: aiResult.match,
      };

    } catch (error) {
      this.logger.error(`findBestMatch failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trouver plusieurs guides matchés
  // ─────────────────────────────────────

  async findTopMatches(
    input: MatchInput,
    limit: number = 3,
  ): Promise<MatchResult[]> {
    try {
      // 1. Récupérer les guides disponibles
      const guides = await this.getAvailableGuides({
        destinationId: input.destination,
        languages: [input.language],
        language: input.language,
      });

      if (!guides.length) return [];

      // 2. Scorer et trier
      const scored = guides
        .map((guide) => ({
          guide,
          score: this.calculateScore(guide, input),
          reasons: this.getMatchReasons(guide, input),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // 3. Enrichir avec IA
      const guidesData = guides.map((g) => ({
        name: g.bio.slice(0, 50),
        languages: g.languages,
        specialty: g.specialty,
        rating: g.rating,
      }));

      const aiResult = await this.aiService.matchGuide({
        destination: input.destination,
        guides: guidesData,
        language: input.language,
        interests: input.interests,
        travelStyle: input.travelStyle,
      });

      return scored.map((item) => ({
        guide: item.guide,
        matchScore: item.score,
        matchReasons: item.reasons,
        aiRecommendation: aiResult.match,
      }));

    } catch (error) {
      this.logger.error(`findTopMatches failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Calculer le score de match
  // ─────────────────────────────────────

  private calculateScore(
    guide: GuideResponse,
    input: MatchInput,
  ): number {
    let score = 0;

    // 1. Langue parlée (+40 points)
    if (guide.languages.includes(input.language)) {
      score += 40;
    }

    // 2. Rating (+30 points max)
    score += (guide.rating / 5) * 30;

    // 3. Nombre de tours (+15 points max)
    score += Math.min(guide.tourCount / 10, 1) * 15;

    // 4. Vérifié (+10 points)
    if (guide.isVerified) {
      score += 10;
    }

    // 5. Intérêts correspondants (+5 points)
    if (input.interests?.length) {
      const specialtyLower = guide.specialty.toLowerCase();
      const matchedInterests = input.interests.filter((i) =>
        specialtyLower.includes(i.toLowerCase()),
      );
      score += Math.min(matchedInterests.length * 2, 5);
    }

    return Math.round(score);
  }

  // ─────────────────────────────────────
  // Raisons du match
  // ─────────────────────────────────────

  private getMatchReasons(
    guide: GuideResponse,
    input: MatchInput,
  ): string[] {
    const reasons: string[] = [];

    if (guide.languages.includes(input.language)) {
      reasons.push(`Speaks ${input.language}`);
    }

    if (guide.rating >= 4.5) {
      reasons.push(`Excellent rating: ${guide.rating}/5`);
    } else if (guide.rating >= 4.0) {
      reasons.push(`Great rating: ${guide.rating}/5`);
    }

    if (guide.isVerified) {
      reasons.push('Verified guide');
    }

    if (guide.tourCount > 50) {
      reasons.push(`${guide.tourCount}+ tours completed`);
    }

    if (guide.experienceYears > 5) {
      reasons.push(`${guide.experienceYears} years experience`);
    }

    if (input.interests?.length) {
      const specialtyLower = guide.specialty.toLowerCase();
      const matched = input.interests.filter((i) =>
        specialtyLower.includes(i.toLowerCase()),
      );
      if (matched.length) {
        reasons.push(`Specializes in: ${matched.join(', ')}`);
      }
    }

    return reasons;
  }

  // ─────────────────────────────────────
  // Récupérer les guides disponibles
  // ─────────────────────────────────────

  private async getAvailableGuides(
    filter: GuideFilterDto,
  ): Promise<GuideResponse[]> {
    // TODO: requête DB avec filtres
    return [];
  }
}