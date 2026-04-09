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
import { HotelService } from './hotel.service';
import {
  CreateHotelDto,
  UpdateHotelDto,
  HotelFilterDto,
  HotelResponse,
} from './hotel.model';
import { AuthMiddleware } from '../auth/auth.middleware';

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  // ─────────────────────────────────────
  // GET /hotels
  // Liste des hôtels avec filtres
  // ─────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<{ hotels: HotelResponse[]; total: number }> {
    const language = (req as any).language || 'en';

    const filter: HotelFilterDto = {
      destinationId: query.destinationId,
      stars: query.stars ? parseInt(query.stars) : undefined,
      minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
      category: query.category,
      language,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      sortBy: query.sortBy || 'rating',
      sortOrder: query.sortOrder || 'desc',
    };

    return this.hotelService.findAll(filter);
  }

  // ─────────────────────────────────────
  // GET /hotels/:id
  // Détail d'un hôtel
  // ─────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<HotelResponse> {
    const language = (req as any).language || 'en';
    return this.hotelService.findById(id, language);
  }

  // ─────────────────────────────────────
  // GET /hotels/:id/availability
  // Vérifier la disponibilité
  // ─────────────────────────────────────

  @Get(':id/availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Param('id') id: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ): Promise<{
    available: boolean;
    pricePerNight: number;
    totalPrice: number;
    nights: number;
  }> {
    return this.hotelService.checkAvailability(
      id,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  // ─────────────────────────────────────
  // GET /hotels/ai/recommendations
  // Recommandations IA personnalisées
  // ─────────────────────────────────────

  @Get('ai/recommendations')
  @HttpCode(HttpStatus.OK)
  async getAiRecommendations(
    @Query('destinationId') destinationId: string,
    @Query('travelStyle') travelStyle: string,
    @Query('budget') budget: string,
    @Query('groupType') groupType: string,
    @Req() req: Request,
  ): Promise<{ recommendations: string; language: string }> {
    const language = (req as any).language || 'en';

    return this.hotelService.getAiRecommendations(
      destinationId,
      language,
      travelStyle,
      budget,
      groupType,
    );
  }

  // ─────────────────────────────────────
  // POST /hotels
  // Créer un hôtel (partner/admin)
  // ─────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateHotelDto,
    @Req() req: Request,
  ): Promise<any> {
    AuthMiddleware.requirePartner(req);
    return this.hotelService.create(dto);
  }

  // ─────────────────────────────────────
  // PUT /hotels/:id
  // Mettre à jour un hôtel (partner/admin)
  // ─────────────────────────────────────

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @Req() req: Request,
  ): Promise<any> {
    AuthMiddleware.requirePartner(req);
    return this.hotelService.update(id, dto);
  }

  // ─────────────────────────────────────
  // DELETE /hotels/:id
  // Supprimer un hôtel (admin)
  // ─────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    AuthMiddleware.requireAdmin(req);
    return this.hotelService.delete(id);
  }
}