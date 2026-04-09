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
import { TripService } from './trip.service';
import {
  CreateTripDto,
  UpdateTripDto,
  TripResponse,
} from './trip.model';
import { AuthMiddleware } from '../auth/auth.middleware';

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  // ─────────────────────────────────────
  // POST /trips/generate
  // Générer un itinéraire IA
  // ─────────────────────────────────────

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @Body() dto: CreateTripDto,
    @Req() req: Request,
  ): Promise<TripResponse> {
    AuthMiddleware.requireAuth(req);

    const language = (req as any).language || 'en';
    const userId = req.user!.id;

    return this.tripService.generate({
      ...dto,
      userId,
      language,
    });
  }

  // ─────────────────────────────────────
  // GET /trips
  // Mes trips
  // ─────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<{ trips: TripResponse[]; total: number }> {
    AuthMiddleware.requireAuth(req);

    const language = (req as any).language || 'en';
    const isAdmin = req.user!.role === 'admin';

    return this.tripService.findAll({
      userId: isAdmin ? query.userId : req.user!.id,
      destinationId: query.destinationId,
      status: query.status,
      language,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  // ─────────────────────────────────────
  // GET /trips/public
  // Trips publics communauté
  // ─────────────────────────────────────

  @Get('public')
  @HttpCode(HttpStatus.OK)
  async findPublic(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<{ trips: TripResponse[]; total: number }> {
    const language = (req as any).language || 'en';

    return this.tripService.findPublic(
      language,
      query.page ? parseInt(query.page) : 1,
      query.limit ? parseInt(query.limit) : 20,
    );
  }

  // ─────────────────────────────────────
  // GET /trips/:id
  // Détail d'un trip
  // ─────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<TripResponse> {
    const language = (req as any).language || 'en';
    return this.tripService.findById(id, language);
  }

  // ─────────────────────────────────────
  // PUT /trips/:id
  // Mettre à jour un trip
  // ─────────────────────────────────────

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @Req() req: Request,
  ): Promise<TripResponse> {
    AuthMiddleware.requireAuth(req);
    const language = (req as any).language || 'en';
    return this.tripService.update(id, dto, language);
  }

  // ─────────────────────────────────────
  // POST /trips/:id/regenerate
  // Régénérer un itinéraire
  // ─────────────────────────────────────

  @Post(':id/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerate(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<TripResponse> {
    AuthMiddleware.requireAuth(req);
    const language = (req as any).language || 'en';
    return this.tripService.regenerate(id, language);
  }

  // ─────────────────────────────────────
  // DELETE /trips/:id
  // Supprimer un trip
  // ─────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    AuthMiddleware.requireAuth(req);
    return this.tripService.delete(id);
  }
}