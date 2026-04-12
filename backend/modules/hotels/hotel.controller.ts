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
import { HotelReviewsService } from './hotel.reviews';
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
  constructor(
    private readonly hotelService: HotelService,
    private readonly reviewsService: HotelReviewsService,
  ) {}

  // ─────────────────────────────────────
  // GET /hotels
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
  // GET /hotels/search
  // ─────────────────────────────────────

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ): Promise<HotelResponse[]> {
    const language = (req as any).language || 'en';
    return this.hotelService.search(query, language, limit ? parseInt(limit) : 10);
  }

  // ─────────────────────────────────────
  // GET /hotels/stats
  // ─────────────────────────────────────

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Req() req: Request): Promise<any> {
    AuthMiddleware.requireAdmin(req);
    return this.hotelService.getStats();
  }

  // ─────────────────────────────────────
  // GET /hotels/ai/recommendations
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
  // GET /hotels/:id
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
  // ─────────────────────────────────────

  @Get(':id/availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Param('id') id: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ): Promise<any> {
    return this.hotelService.checkAvailability(
      id,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  // ─────────────────────────────────────
  // GET /hotels/:id/reviews
  // ─────────────────────────────────────

  @Get(':id/reviews')
  @HttpCode(HttpStatus.OK)
  async getReviews(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ): Promise<any> {
    const language = (req as any).language || 'en';
    return this.reviewsService.findByHotel(id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      language,
    });
  }

  // ─────────────────────────────────────
  // GET /hotels/:id/rating
  // ─────────────────────────────────────

  @Get(':id/rating')
  @HttpCode(HttpStatus.OK)
  async getRating(@Param('id') id: string): Promise<any> {
    return this.reviewsService.getRatingSummary(id);
  }

  // ─────────────────────────────────────
  // POST /hotels
  // ─────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateHotelDto,
    @Req() req: Request,
  ): Promise<HotelResponse> {
    AuthMiddleware.requirePartner(req);
    return this.hotelService.create(dto);
  }

  // ─────────────────────────────────────
  // POST /hotels/:id/reviews
  // ─────────────────────────────────────

  @Post(':id/reviews')
  @HttpCode(HttpStatus.CREATED)
  async addReview(
    @Param('id') hotelId: string,
    @Body() body: any,
    @Req() req: Request,
  ): Promise<any> {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;
    const language = (req as any).language || 'en';

    const review = await this.reviewsService.create({
      userId,
      hotelId,
      bookingId: body.bookingId,
      rating: body.rating,
      comment: body.comment,
      originalLanguage: language,
      cleanliness: body.cleanliness,
      service: body.service,
      location: body.location,
      value: body.value,
    });

    // Mettre à jour le rating de l'hôtel
    await this.hotelService.updateRating(hotelId);

    return review;
  }

  // ─────────────────────────────────────
  // PUT /hotels/:id
  // ─────────────────────────────────────

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @Req() req: Request,
  ): Promise<HotelResponse> {
    AuthMiddleware.requirePartner(req);
    const language = (req as any).language || 'en';
    return this.hotelService.update(id, dto, language);
  }

  // ─────────────────────────────────────
  // PUT /hotels/:id/verify
  // ─────────────────────────────────────

  @Put(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ verified: boolean }> {
    AuthMiddleware.requireAdmin(req);
    await this.hotelService.update(id, { isVerified: true } as any);
    return { verified: true };
  }

  // ─────────────────────────────────────
  // DELETE /hotels/:id
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