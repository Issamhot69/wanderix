import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  BookingModel,
  BookingResponse,
  CreateBookingDto,
  UpdateBookingDto,
  BookingFilterDto,
  BookingStatus,
} from './booking.model';
import { CommissionEngine } from './commission.engine';

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly commissionEngine: CommissionEngine,
  ) {}

  // ─────────────────────────────────────
  // Créer une réservation
  // ─────────────────────────────────────

  async create(dto: CreateBookingDto): Promise<BookingResponse> {
    try {
      // 1. Calculer le prix de base
      const baseAmount = await this.calculateBaseAmount(dto);

      // 2. Calculer la commission Wanderix
      const { commissionRate, commissionAmount, totalAmount } =
        await this.commissionEngine.calculate({
          bookingType: dto.bookingType,
          baseAmount,
          currency: dto.currency || 'USD',
        });

      // 3. Créer la réservation en DB
      const booking: BookingModel = {
        id: crypto.randomUUID(),
        userId: dto.userId,
        tripId: dto.tripId,
        bookingType: dto.bookingType,
        hotelId: dto.hotelId,
        guideId: dto.guideId,
        flightRef: dto.flightRef,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        bookingDate: new Date(),
        baseAmount,
        commissionRate,
        commissionAmount,
        totalAmount,
        currency: dto.currency || 'USD',
        status: 'pending',
        language: dto.language || 'en',
        notes: dto.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(`Booking created: ${booking.id}`);
      return this.toResponse(booking);

    } catch (error) {
      this.logger.error(`create booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Lister les réservations
  // ─────────────────────────────────────

  async findAll(
    filter: BookingFilterDto,
  ): Promise<{ bookings: BookingResponse[]; total: number }> {
    try {
      // TODO: requête DB avec filtres
      const bookings: BookingModel[] = [];
      const total = 0;

      return {
        bookings: bookings.map(this.toResponse),
        total,
      };

    } catch (error) {
      this.logger.error(`findAll bookings failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trouver une réservation par ID
  // ─────────────────────────────────────

  async findById(id: string): Promise<BookingResponse> {
    try {
      // TODO: requête DB
      const booking: BookingModel | null = null;

      if (!booking) {
        throw new NotFoundException(`Booking ${id} not found`);
      }

      return this.toResponse(booking);

    } catch (error) {
      this.logger.error(`findById booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Confirmer une réservation
  // ─────────────────────────────────────

  async confirm(id: string): Promise<BookingResponse> {
    try {
      const booking = await this.findById(id);

      if (booking.status !== 'pending') {
        throw new BadRequestException(
          `Booking ${id} cannot be confirmed — status: ${booking.status}`,
        );
      }

      // TODO: update DB status → confirmed
      this.logger.log(`Booking confirmed: ${id}`);
      return { ...booking, status: 'confirmed' };

    } catch (error) {
      this.logger.error(`confirm booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Annuler une réservation
  // ─────────────────────────────────────

  async cancel(id: string, userId: string): Promise<BookingResponse> {
    try {
      const booking = await this.findById(id);

      if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
        throw new BadRequestException(
          `Booking ${id} cannot be cancelled — status: ${booking.status}`,
        );
      }

      // TODO: update DB status → cancelled
      // TODO: déclencher le remboursement si payment existe
      this.logger.log(`Booking cancelled: ${id} by user ${userId}`);
      return { ...booking, status: 'cancelled' };

    } catch (error) {
      this.logger.error(`cancel booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Compléter une réservation
  // ─────────────────────────────────────

  async complete(id: string): Promise<BookingResponse> {
    try {
      const booking = await this.findById(id);

      if (booking.status !== 'confirmed') {
        throw new BadRequestException(
          `Booking ${id} cannot be completed — status: ${booking.status}`,
        );
      }

      // TODO: update DB status → completed
      // TODO: déclencher le payout vers le partenaire
      this.logger.log(`Booking completed: ${id}`);
      return { ...booking, status: 'completed' };

    } catch (error) {
      this.logger.error(`complete booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Statistiques (admin)
  // ─────────────────────────────────────

  async getStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    totalRevenue: number;
    totalCommission: number;
  }> {
    try {
      // TODO: agrégation DB
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        totalRevenue: 0,
        totalCommission: 0,
      };

    } catch (error) {
      this.logger.error(`getStats failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Helpers privés
  // ─────────────────────────────────────

  private async calculateBaseAmount(
    dto: CreateBookingDto,
  ): Promise<number> {
    if (dto.bookingType === 'hotel' && dto.hotelId && dto.checkIn && dto.checkOut) {
      const nights = Math.ceil(
        (new Date(dto.checkOut).getTime() - new Date(dto.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
      );
      // TODO: récupérer le prix/nuit depuis la DB
      const pricePerNight = 100;
      return pricePerNight * nights;
    }

    if (dto.bookingType === 'guide' && dto.guideId) {
      // TODO: récupérer le prix depuis la DB
      return 150;
    }

    if (dto.bookingType === 'flight' && dto.flightRef) {
      // TODO: récupérer le prix depuis Amadeus
      return 300;
    }

    return 0;
  }

  private toResponse(booking: BookingModel): BookingResponse {
    return {
      id: booking.id,
      bookingType: booking.bookingType,
      status: booking.status,
      hotelId: booking.hotelId,
      guideId: booking.guideId,
      flightRef: booking.flightRef,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      baseAmount: booking.baseAmount,
      commissionAmount: booking.commissionAmount,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      language: booking.language,
      notes: booking.notes,
      bookingDate: booking.bookingDate,
    };
  }
}