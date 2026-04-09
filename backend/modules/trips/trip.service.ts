import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  TripModel,
  TripResponse,
  CreateTripDto,
  UpdateTripDto,
  TripFilterDto,
  localizeTrip,
} from './trip.model';
import { AiService } from '../ai/ai.service';

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    private readonly aiService: AiService,
  ) {}

  // ─────────────────────────────────────
  // Générer un trip via IA
  // ─────────────────────────────────────

  async generate(dto: CreateTripDto): Promise<TripResponse> {
    try {
      const language = dto.language || 'en';

      // 1. Appeler l'AI Engine pour générer l'itinéraire
      const aiResult = await this.aiService.generateItinerary({
        destination: dto.destination,
        language,
        nationality: dto.nationality,
        travelStyle: dto.travelStyle,
        interests: dto.interests,
        budget: dto.budgetLevel,
        tripDuration: dto.durationDays,
        groupType: dto.groupType,
      });

      // 2. Parser la réponse IA en structure Trip
      const trip = await this.parseAiResponse(
        aiResult.itinerary,
        dto,
        language,
      );

      // 3. Sauvegarder en DB
      // TODO: save to DB
      this.logger.log(`Trip generated: ${trip.id} for user ${dto.userId}`);

      return localizeTrip(trip, language);

    } catch (error) {
      this.logger.error(`generate trip failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Lister les trips
  // ─────────────────────────────────────

  async findAll(
    filter: TripFilterDto,
  ): Promise<{ trips: TripResponse[]; total: number }> {
    try {
      const language = filter.language || 'en';

      // TODO: requête DB avec filtres
      const trips: TripModel[] = [];
      const total = 0;

      return {
        trips: trips.map((t) => localizeTrip(t, language)),
        total,
      };

    } catch (error) {
      this.logger.error(`findAll trips failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trouver un trip par ID
  // ─────────────────────────────────────

  async findById(
    id: string,
    language: string = 'en',
  ): Promise<TripResponse> {
    try {
      // TODO: requête DB
      const trip: TripModel | null = null;

      if (!trip) {
        throw new NotFoundException(`Trip ${id} not found`);
      }

      return localizeTrip(trip, language);

    } catch (error) {
      this.logger.error(`findById trip failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Mettre à jour un trip
  // ─────────────────────────────────────

  async update(
    id: string,
    dto: UpdateTripDto,
    language: string = 'en',
  ): Promise<TripResponse> {
    try {
      const trip = await this.findById(id, language);
      if (!trip) throw new NotFoundException(`Trip ${id} not found`);

      // TODO: update DB
      this.logger.log(`Trip updated: ${id}`);
      return { ...trip, ...dto } as TripResponse;

    } catch (error) {
      this.logger.error(`update trip failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Supprimer un trip
  // ─────────────────────────────────────

  async delete(id: string): Promise<void> {
    try {
      // TODO: soft delete DB
      this.logger.log(`Trip deleted: ${id}`);
    } catch (error) {
      this.logger.error(`delete trip failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Régénérer un itinéraire existant
  // ─────────────────────────────────────

  async regenerate(
    id: string,
    language: string = 'en',
  ): Promise<TripResponse> {
    try {
      const existing = await this.findById(id, language);
      if (!existing) throw new NotFoundException(`Trip ${id} not found`);

      // Régénérer avec les mêmes paramètres
      return await this.generate({
        userId: 'existing-user-id',
        destination: existing.title,
        language,
        durationDays: existing.durationDays,
        travelStyle: existing.travelStyle,
        budgetLevel: existing.budgetLevel,
        groupType: existing.groupType,
        interests: existing.interests,
      });

    } catch (error) {
      this.logger.error(`regenerate trip failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trips publics (communauté)
  // ─────────────────────────────────────

  async findPublic(
    language: string = 'en',
    page: number = 1,
    limit: number = 20,
  ): Promise<{ trips: TripResponse[]; total: number }> {
    try {
      return await this.findAll({
        isPublic: true,
        language,
        page,
        limit,
      });
    } catch (error) {
      this.logger.error(`findPublic trips failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Parser la réponse IA → TripModel
  // ─────────────────────────────────────

  private async parseAiResponse(
    aiText: string,
    dto: CreateTripDto,
    language: string,
  ): Promise<TripModel> {
    // Construire un TripModel structuré depuis le texte IA
    const days = [];

    for (let i = 1; i <= dto.durationDays; i++) {
      days.push({
        day: i,
        morning: { [language]: `Day ${i} morning activity` },
        afternoon: { [language]: `Day ${i} afternoon activity` },
        evening: { [language]: `Day ${i} evening recommendation` },
        dining: { [language]: `Day ${i} dining suggestion` },
      });
    }

    return {
      id: crypto.randomUUID(),
      userId: dto.userId,
      destinationId: dto.destinationId,
      title: { [language]: `${dto.destination} — ${dto.durationDays} Days` },
      overview: { [language]: aiText.slice(0, 500) },
      itinerary: days,
      practicalTips: { [language]: '' },
      language,
      durationDays: dto.durationDays,
      travelStyle: dto.travelStyle,
      budgetLevel: dto.budgetLevel,
      groupType: dto.groupType,
      interests: dto.interests,
      startDate: dto.startDate,
      status: 'draft',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}