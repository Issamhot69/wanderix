import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface CreateReviewDto {
  userId: string;
  hotelId: string;
  bookingId: string;
  rating: number;
  comment: string;
  originalLanguage: string;
  cleanliness?: number;
  service?: number;
  location?: number;
  value?: number;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  hotelId: string;
  rating: number;
  comment: string;
  cleanliness?: number;
  service?: number;
  location?: number;
  value?: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface HotelRatingSummary {
  average: number;
  total: number;
  breakdown: {
    cleanliness: number;
    service: number;
    location: number;
    value: number;
  };
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ─────────────────────────────────────────
// Service Reviews
// ─────────────────────────────────────────

@Injectable()
export class HotelReviewsService {
  private readonly logger = new Logger(HotelReviewsService.name);

  // ─────────────────────────────────────
  // Créer un avis
  // ─────────────────────────────────────

  async create(dto: CreateReviewDto): Promise<ReviewResponse> {
    try {
      // 1. Valider le rating
      if (dto.rating < 1 || dto.rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      // 2. Vérifier que la réservation appartient au user
      const bookingValid = await this.verifyBooking(dto.bookingId, dto.userId);
      if (!bookingValid) {
        throw new BadRequestException('You can only review hotels you have stayed in');
      }

      // 3. Vérifier qu'un avis n'existe pas déjà
      const existing = await this.findByBooking(dto.bookingId);
      if (existing) {
        throw new BadRequestException('You have already reviewed this stay');
      }

      // 4. Créer l'avis en DB
      const review: ReviewResponse = {
        id: crypto.randomUUID(),
        userId: dto.userId,
        hotelId: dto.hotelId,
        rating: dto.rating,
        comment: dto.comment,
        cleanliness: dto.cleanliness,
        service: dto.service,
        location: dto.location,
        value: dto.value,
        isVerified: true,
        createdAt: new Date(),
      };

      // 5. Mettre à jour le rating moyen de l'hôtel
      await this.recalculateHotelRating(dto.hotelId);

      this.logger.log(`Review created for hotel ${dto.hotelId}`);
      return review;

    } catch (error) {
      this.logger.error(`create review failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Lister les avis d'un hôtel
  // ─────────────────────────────────────

  async findByHotel(
    hotelId: string,
    options: {
      page?: number;
      limit?: number;
      language?: string;
      sortBy?: 'recent' | 'rating_high' | 'rating_low';
    } = {},
  ): Promise<{ reviews: ReviewResponse[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;

      // TODO: requête DB avec pagination
      const reviews: ReviewResponse[] = [];
      const total = 0;

      return { reviews, total };

    } catch (error) {
      this.logger.error(`findByHotel failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Résumé des ratings d'un hôtel
  // ─────────────────────────────────────

  async getRatingSummary(hotelId: string): Promise<HotelRatingSummary> {
    try {
      // TODO: agrégation DB
      return {
        average: 0,
        total: 0,
        breakdown: {
          cleanliness: 0,
          service: 0,
          location: 0,
          value: 0,
        },
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

    } catch (error) {
      this.logger.error(`getRatingSummary failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Supprimer un avis (admin)
  // ─────────────────────────────────────

  async delete(reviewId: string): Promise<void> {
    try {
      const review = await this.findById(reviewId);
      if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

      // TODO: soft delete DB
      await this.recalculateHotelRating(review.hotelId);
      this.logger.log(`Review deleted: ${reviewId}`);

    } catch (error) {
      this.logger.error(`delete review failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Helpers privés
  // ─────────────────────────────────────

  private async verifyBooking(
    bookingId: string,
    userId: string,
  ): Promise<boolean> {
    // TODO: vérifier en DB que la réservation est complétée
    return true;
  }

  private async findByBooking(
    bookingId: string,
  ): Promise<ReviewResponse | null> {
    // TODO: requête DB
    return null;
  }

  private async findById(
    reviewId: string,
  ): Promise<ReviewResponse | null> {
    // TODO: requête DB
    return null;
  }

  private async recalculateHotelRating(hotelId: string): Promise<void> {
    try {
      // TODO: recalculer le rating moyen en DB
      // UPDATE hotels SET rating = AVG(reviews.rating), review_count = COUNT(reviews.id)
      // WHERE hotels.id = hotelId
      this.logger.log(`Rating recalculated for hotel ${hotelId}`);
    } catch (error) {
      this.logger.error(`recalculateHotelRating failed: ${error.message}`);
    }
  }
}