// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type BookingType = 'hotel' | 'flight' | 'guide' | 'activity';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'refunded';

// ─────────────────────────────────────────
// Modèle Booking
// ─────────────────────────────────────────

export interface BookingModel {
  id: string;
  userId: string;
  tripId?: string;

  // Type
  bookingType: BookingType;

  // Références
  hotelId?: string;
  guideId?: string;
  flightRef?: string;

  // Dates
  checkIn?: Date;
  checkOut?: Date;
  bookingDate: Date;

  // Tarification
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  totalAmount: number;
  currency: string;

  // Statut
  status: BookingStatus;

  // Multilingue
  language: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface CreateBookingDto {
  userId: string;
  tripId?: string;
  bookingType: BookingType;
  hotelId?: string;
  guideId?: string;
  flightRef?: string;
  checkIn?: Date;
  checkOut?: Date;
  currency?: string;
  language?: string;
  notes?: string;
}

export interface UpdateBookingDto {
  status?: BookingStatus;
  notes?: string;
}

export interface BookingFilterDto {
  userId?: string;
  status?: BookingStatus;
  bookingType?: BookingType;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────
// Response
// ─────────────────────────────────────────

export interface BookingResponse {
  id: string;
  bookingType: BookingType;
  status: BookingStatus;
  hotelId?: string;
  guideId?: string;
  flightRef?: string;
  checkIn?: Date;
  checkOut?: Date;
  baseAmount: number;
  commissionAmount: number;
  totalAmount: number;
  currency: string;
  language: string;
  notes?: string;
  bookingDate: Date;
}