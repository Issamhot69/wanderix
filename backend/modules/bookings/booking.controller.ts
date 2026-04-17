import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingService, CreateBookingDto } from './booking.service';
import { AuthMiddleware } from '../auth/auth.middleware';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ─────────────────────────────────────
  // POST /bookings — Créer une réservation
  // ─────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: any,
    @Req() req: Request,
  ) {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;

    const dto: CreateBookingDto = {
      userId,
      hotelId: body.hotelId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults: body.adults || 2,
      children: body.children || 0,
      rooms: body.rooms || 1,
      specialRequests: body.specialRequests,
      currency: body.currency || 'USD',
    };

    return this.bookingService.create(dto);
  }

  // ─────────────────────────────────────
  // GET /bookings/me — Mes réservations
  // ─────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyBookings(@Req() req: Request) {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;
    return this.bookingService.findByUser(userId);
  }

  // ─────────────────────────────────────
  // GET /bookings/stats — Stats admin
  // ─────────────────────────────────────

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Req() req: Request) {
    AuthMiddleware.requireAdmin(req);
    return this.bookingService.getStats();
  }

  // ─────────────────────────────────────
  // GET /bookings/:id — Détails
  // ─────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    AuthMiddleware.requireAuth(req);
    return this.bookingService.findById(id);
  }

  // ─────────────────────────────────────
  // PUT /bookings/:id/confirm — Confirmer
  // ─────────────────────────────────────

  @Put(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    AuthMiddleware.requireAdmin(req);
    return this.bookingService.confirm(id);
  }

  // ─────────────────────────────────────
  // PUT /bookings/:id/cancel — Annuler
  // ─────────────────────────────────────

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;
    return this.bookingService.cancel(id, userId);
  }
}