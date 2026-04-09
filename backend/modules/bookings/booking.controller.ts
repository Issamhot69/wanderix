import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { BookingService } from './booking.service';
import {
  CreateBookingDto,
  BookingResponse,
  BookingFilterDto,
} from './booking.model';
import { AuthMiddleware } from '../auth/auth.middleware';

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ─────────────────────────────────────
  // POST /bookings
  // Créer une réservation
  // ─────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookingDto,
    @Req() req: Request,
  ): Promise<BookingResponse> {
    AuthMiddleware.requireAuth(req);

    const language = (req as any).language || 'en';
    const userId = req.user!.id;

    return this.bookingService.create({
      ...dto,
      userId,
      language,
    });
  }

  // ─────────────────────────────────────
  // GET /bookings
  // Lister les réservations
  // ─────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<{ bookings: BookingResponse[]; total: number }> {
    AuthMiddleware.requireAuth(req);

    const isAdmin = req.user!.role === 'admin';

    const filter: BookingFilterDto = {
      // Admin voit tout, tourist voit seulement les siennes
      userId: isAdmin ? query.userId : req.user!.id,
      status: query.status,
      bookingType: query.bookingType,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    };

    return this.bookingService.findAll(filter);
  }

  // ─────────────────────────────────────
  // GET /bookings/stats
  // Statistiques (admin)
  // ─────────────────────────────────────

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Req() req: Request): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    totalRevenue: number;
    totalCommission: number;
  }> {
    AuthMiddleware.requireAdmin(req);
    return this.bookingService.getStats();
  }

  // ─────────────────────────────────────
  // GET /bookings/:id
  // Détail d'une réservation
  // ─────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BookingResponse> {
    AuthMiddleware.requireAuth(req);
    return this.bookingService.findById(id);
  }

  // ─────────────────────────────────────
  // PUT /bookings/:id/confirm
  // Confirmer une réservation (partner/admin)
  // ─────────────────────────────────────

  @Put(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BookingResponse> {
    AuthMiddleware.requirePartner(req);
    return this.bookingService.confirm(id);
  }

  // ─────────────────────────────────────
  // PUT /bookings/:id/cancel
  // Annuler une réservation
  // ─────────────────────────────────────

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BookingResponse> {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;
    return this.bookingService.cancel(id, userId);
  }

  // ─────────────────────────────────────
  // PUT /bookings/:id/complete
  // Compléter une réservation (admin)
  // ─────────────────────────────────────

  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BookingResponse> {
    AuthMiddleware.requireAdmin(req);
    return this.bookingService.complete(id);
  }
}
