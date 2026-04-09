import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ItineraryDay, TravelStyle, BudgetLevel, GroupType, MultilingualText } from './trip.model';

export interface GenerateItineraryInput {
  destination: string;
  durationDays: number;
  language: string;
  nationality?: string;
  travelStyle?: TravelStyle;
  budgetLevel?: BudgetLevel;
  groupType?: GroupType;
  interests?: string[];
}

export interface GeneratedItinerary {
  title: MultilingualText;
  overview: MultilingualText;
  days: ItineraryDay[];
  practicalTips: MultilingualText;
  estimatedBudget: { min: number; max: number; currency: string };
}

const BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  low: { min: 50, max: 100 },
  medium: { min: 100, max: 250 },
  high: { min: 250, max: 1000 },
};

@Injectable()
export class ItineraryGenerator {
  private readonly logger = new Logger(ItineraryGenerator.name);

  constructor(private readonly aiService: AiService) {}

  async generate(input: GenerateItineraryInput): Promise<GeneratedItinerary> {
    try {
      const aiResult = await this.aiService.generateItinerary({
        destination: input.destination,
        language: input.language,
        nationality: input.nationality,
        travelStyle: input.travelStyle,
        interests: input.interests,
        budget: input.budgetLevel,
        tripDuration: input.durationDays,
        groupType: input.groupType,
      });

      const days = this.parseDays(aiResult.itinerary, input.durationDays, input.language);
      const budget = this.estimateBudget(input.budgetLevel || 'medium', input.durationDays);

      return {
        title: { [input.language]: input.destination + ' - ' + input.durationDays + ' Days' },
        overview: { [input.language]: this.extractOverview(aiResult.itinerary) },
        days,
        practicalTips: { [input.language]: this.extractPracticalTips(aiResult.itinerary) },
        estimatedBudget: { ...budget, currency: 'USD' },
      };
    } catch (error) {
      this.logger.error('generate itinerary failed: ' + error.message);
      throw error;
    }
  }

  private parseDays(aiText: string, durationDays: number, language: string): ItineraryDay[] {
    const days: ItineraryDay[] = [];
    for (let i = 1; i <= durationDays; i++) {
      days.push({
        day: i,
        morning: { [language]: 'Day ' + i + ' morning activity' },
        afternoon: { [language]: 'Day ' + i + ' afternoon activity' },
        evening: { [language]: 'Day ' + i + ' evening recommendation' },
        dining: { [language]: 'Day ' + i + ' dining suggestion' },
      });
    }
    return days;
  }

  private extractOverview(aiText: string): string {
    return aiText.split('.').slice(0, 3).join('.').trim() + '.';
  }

  private extractPracticalTips(aiText: string): string {
    const match = aiText.match(/practical tips?:?([\s\S]*?)(?:\n\n|$)/i);
    return match ? match[1].trim() : '';
  }

  private estimateBudget(level: string, days: number): { min: number; max: number } {
    const range = BUDGET_RANGES[level] || BUDGET_RANGES['medium'];
    return { min: range.min * days, max: range.max * days };
  }
}
