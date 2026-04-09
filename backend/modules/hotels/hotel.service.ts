import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  HotelModel,
  HotelResponse,
  CreateHotelDto,
  UpdateHotelDto,
  HotelFilterDto,
  localizeHotel,
} from './hotel.model';
import { AiService } from '../ai/ai.service';

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class HotelService {
  private readonly logger = new Logger(HotelService.name);

  constructor(
    private readonly aiService: AiService,
  ) {}

  // ─────────────────────────────────────
  // Créer un hôtel
  // ─────────────────────────────────────

  async create(dto: CreateHotelDto): Promise<HotelModel> {
    try {
      // TODO: connecter avec DB (Prisma/TypeORM)
      const hotel: HotelModel = {
        id: crypto.randomUUID(),
        destinationId: dto.destinationId,
        partnerId: dto.partnerId,
        name: dto.name,
        description: dto.description || {},
        amenities: dto.amenities || {},
        address: dto.address || {},
        stars: dto.stars,
        category: dto.category,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        latitude: dto.latitude,
        longitude: dto.longitude,
        pricePerNight: dto.pricePerNight,
        currency: dto.currency || 'USD',
        coverImageUrl: dto.coverImageUrl,
        images: dto.images || [],
        rating: 0,
        reviewCount: 0,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(`Hotel created: ${hotel.id}`);
      return hotel;

    } catch (error) {
      this.logger.error(`create hotel failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Lister les hôtels avec filtres
  // ─────────────────────────────────────

  async findAll(
    filter: HotelFilterDto,
  ): Promise<{ hotels: HotelResponse[]; total: number }> {
    try {
      const language = filter.language || 'en';
      const page = filter.page || 1;
      const limit = filter.limit || 20;

      // TODO: requête DB avec filtres
      const hotels: HotelModel[] = [];
      const total = 0;

      return {
        hotels: hotels.map((h) => localizeHotel(h, language)),
        total,
      };

    } catch (error) {
      this.logger.error(`findAll hotels failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trouver un hôtel par ID
  // ─────────────────────────────────────

  async findById(
    id: string,
    language: string = 'en',
  ): Promise<HotelResponse> {
    try {
      // TODO: requête DB
      const hotel: HotelModel | null = null;

      if (!hotel) {
        throw new NotFoundException(`Hotel ${id} not found`);
      }

      return localizeHotel(hotel, language);

    } catch (error) {
      this.logger.error(`findById hotel failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Mettre à jour un hôtel
  // ─────────────────────────────────────

  async update(
    id: string,
    dto: UpdateHotelDto,
  ): Promise<HotelModel> {
    try {
      // TODO: update DB
      this.logger.log(`Hotel updated: ${id}`);
      return {} as HotelModel;

    } catch (error) {
      this.logger.error(`update hotel failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Supprimer un hôtel
  // ─────────────────────────────────────

  async delete(id: string): Promise<void> {
    try {
      // TODO: soft delete DB
      this.logger.log(`Hotel deleted: ${id}`);
    } catch (error) {
      this.logger.error(`delete hotel failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Recommandations IA
  // ─────────────────────────────────────

  async getAiRecommendations(
    destinationId: string,
    language: string,
    travelStyle?: string,
    budget?: string,
    groupType?: string,
  ): Promise<{
    recommendations: string;
    language: string;
  }> {
    try {
      // 1. Récupérer les hôtels de la destination
      const { hotels } = await this.findAll({ destinationId, language });

      // 2. Préparer les données pour l'AI Engine
      const hotelsData = hotels.map((h) => ({
        name: h.name,
        stars: h.stars,
        price: h.pricePerNight,
        rating: h.rating,
        category: h.category,
      }));

      // 3. Appeler l'AI Engine
      const result = await this.aiService.recommendHotels({
        destination: destinationId,
        hotels: hotelsData,
        language,
        travelStyle,
        budget,
        groupType,
      });

      return result;

    } catch (error) {
      this.logger.error(`AI recommendations failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Mettre à jour le rating
  // ─────────────────────────────────────

  async updateRating(
    hotelId: string,
    newRating: number,
  ): Promise<void> {
    try {
      // TODO: recalculer le rating moyen en DB
      this.logger.log(`Hotel ${hotelId} rating updated: ${newRating}`);
    } catch (error) {
      this.logger.error(`updateRating failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Disponibilité
  // ─────────────────────────────────────

  async checkAvailability(
    hotelId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{
    available: boolean;
    pricePerNight: number;
    totalPrice: number;
    nights: number;
  }> {
    try {
      const hotel = await this.findById(hotelId);

      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      // TODO: vérifier les réservations existantes en DB
      const available = true;

      return {
        available,
        pricePerNight: hotel.pricePerNight,
        totalPrice: hotel.pricePerNight * nights,
        nights,
      };

    } catch (error) {
      this.logger.error(`checkAvailability failed: ${error.message}`);
      throw error;
    }
  }
}