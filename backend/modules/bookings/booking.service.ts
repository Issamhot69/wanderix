import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface CreateBookingDto {
  userId: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  rooms?: number;
  specialRequests?: string;
  currency?: string;
}

export interface BookingResponse {
  id: string;
  userId: string;
  hotelId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  nights: number;
  pricePerNight: number;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  specialRequests: string;
  confirmationCode: string;
  createdAt: string;
}

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  // ─────────────────────────────────────
  // Créer une réservation
  // ─────────────────────────────────────

  async create(dto: CreateBookingDto): Promise<BookingResponse> {
    try {
      // 1. Récupérer l'hôtel
      const hotelResult = await pool.query(
        'SELECT * FROM hotels WHERE id = $1 AND is_active = true',
        [dto.hotelId]
      );

      if (!hotelResult.rows[0]) {
        throw new NotFoundException(`Hotel ${dto.hotelId} not found`);
      }

      const hotel = hotelResult.rows[0];

      // 2. Calculer les nuits et le prix
      const checkIn = new Date(dto.checkIn);
      const checkOut = new Date(dto.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        throw new BadRequestException('Check-out must be after check-in');
      }

      const rooms = dto.rooms || 1;
      const pricePerNight = Number(hotel.price_per_night);
      const baseAmount = pricePerNight * nights * rooms;
      const taxAmount = Math.round(baseAmount * 0.1 * 100) / 100;
      const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
      const currency = dto.currency || hotel.currency || 'USD';

      // 3. Générer code de confirmation
      const confirmationCode = `WDX-${Date.now().toString(36).toUpperCase()}`;

      // 4. Créer en DB
      const result = await pool.query(
        `INSERT INTO bookings (
          id, user_id, hotel_id, status,
          check_in, check_out,
          base_amount, total_amount, currency,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'pending',
          $3, $4,
          $5, $6, $7,
          NOW(), NOW()
        ) RETURNING *`,
        [
          dto.userId,
          dto.hotelId,
          dto.checkIn,
          dto.checkOut,
          baseAmount,
          totalAmount,
          currency,
        ]
      );

      const booking = result.rows[0];

      this.logger.log(`Booking created: ${booking.id}`);

      return {
        id: booking.id,
        userId: booking.user_id,
        hotelId: booking.hotel_id,
        status: booking.status,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        adults: dto.adults,
        children: dto.children || 0,
        rooms,
        nights,
        pricePerNight,
        baseAmount,
        taxAmount,
        totalAmount,
        currency,
        specialRequests: dto.specialRequests || '',
        confirmationCode,
        createdAt: booking.created_at,
      };

    } catch (error) {
      this.logger.error(`create booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Lister les réservations d'un user
  // ─────────────────────────────────────

  async findByUser(userId: string): Promise<BookingResponse[]> {
    try {
      const result = await pool.query(
        `SELECT b.*, h.name as hotel_name, h.cover_image_url
         FROM bookings b
         LEFT JOIN hotels h ON b.hotel_id = h.id
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC`,
        [userId]
      );

      return result.rows.map(this.mapRow);

    } catch (error) {
      this.logger.error(`findByUser failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Trouver une réservation par ID
  // ─────────────────────────────────────

  async findById(id: string): Promise<BookingResponse> {
    try {
      const result = await pool.query(
        `SELECT b.*, h.name as hotel_name, h.cover_image_url
         FROM bookings b
         LEFT JOIN hotels h ON b.hotel_id = h.id
         WHERE b.id = $1`,
        [id]
      );

      if (!result.rows[0]) {
        throw new NotFoundException(`Booking ${id} not found`);
      }

      return this.mapRow(result.rows[0]);

    } catch (error) {
      this.logger.error(`findById failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Annuler une réservation
  // ─────────────────────────────────────

  async cancel(id: string, userId: string): Promise<BookingResponse> {
    try {
      const booking = await this.findById(id);

      if (booking.userId !== userId) {
        throw new BadRequestException('You can only cancel your own bookings');
      }

      if (booking.status === 'cancelled') {
        throw new BadRequestException('Booking already cancelled');
      }

      const result = await pool.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );

      this.logger.log(`Booking cancelled: ${id}`);
      return this.mapRow(result.rows[0]);

    } catch (error) {
      this.logger.error(`cancel booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Confirmer une réservation
  // ─────────────────────────────────────

  async confirm(id: string): Promise<BookingResponse> {
    try {
      const result = await pool.query(
        `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id]
      );

      if (!result.rows[0]) {
        throw new NotFoundException(`Booking ${id} not found`);
      }

      this.logger.log(`Booking confirmed: ${id}`);
      return this.mapRow(result.rows[0]);

    } catch (error) {
      this.logger.error(`confirm booking failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Stats (admin)
  // ─────────────────────────────────────

  async getStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
        FROM bookings
      `);

      return result.rows[0];

    } catch (error) {
      this.logger.error(`getStats failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Helper
  // ─────────────────────────────────────

  private mapRow(row: any): BookingResponse {
    return {
      id: row.id,
      userId: row.user_id,
      hotelId: row.hotel_id,
      status: row.status,
      checkIn: row.check_in,
      checkOut: row.check_out,
      adults: row.adults || 1,
      children: row.children || 0,
      rooms: row.rooms || 1,
      nights: 0,
      pricePerNight: Number(row.base_amount),
      baseAmount: Number(row.base_amount),
      taxAmount: 0,
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      specialRequests: row.special_requests || '',
      confirmationCode: row.confirmation_code || '',
      createdAt: row.created_at,
    };
  }
}