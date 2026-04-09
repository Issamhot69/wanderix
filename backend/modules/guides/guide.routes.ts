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
import { GuideMatcher, MatchInput } from './guide.matcher';
import {
  CreateGuideDto,
  UpdateGuideDto,
  GuideResponse,
  localizeGuide,
} from './guide.model';
import { AuthMiddleware } from '../auth/auth.middleware';

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('guides')
export class GuideController {
  constructor(
    private readonly guideMatcher: GuideMatcher,
  ) {}

  // ─────────────────────────────────────
  // GET /guides
  // Lister les guides avec filtres
  // ─────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<{ guides: GuideResponse[]; total: number }> {
    const language = (req as any).language || 'en';

    // TODO: connecter avec GuideService.findAll()
    return { guides: [], total: 0 };
  }

  // ─────────────────────────────────────
  // GET /guides/match
  // Trouver le meilleur guide IA
  // ─────────────────────────────────────

  @Get('match')
  @HttpCode(HttpStatus.OK)
  async findBestMatch(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<any> {
    const language = (req as any).language || 'en';

    const input: MatchInput = {
      destination: query.destination,
      language,
      interests: query.interests?.split(','),
      travelStyle: query.travelStyle,
      budget: query.budget,
      groupType: query.groupType,
    };

    return this.guideMatcher.findBestMatch(input);
  }

  // ─────────────────────────────────────
  // GET /guides/match/top
  // Top 3 guides matchés par IA
  // ─────────────────────────────────────

  @Get('match/top')
  @HttpCode(HttpStatus.OK)
  async findTopMatches(
    @Query() query: any,
    @Req() req: Request,
  ): Promise<any[]> {
    const language = (req as any).language || 'en';

    const input: MatchInput = {
      destination: query.destination,
      language,
      interests: query.interests?.split(','),
      travelStyle: query.travelStyle,
      budget: query.budget,
      groupType: query.groupType,
    };

    const limit = query.limit ? parseInt(query.limit) : 3;
    return this.guideMatcher.findTopMatches(input, limit);
  }

  // ─────────────────────────────────────
  // GET /guides/:id
  // Détail d'un guide
  // ─────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<GuideResponse> {
    const language = (req as any).language || 'en';

    // TODO: connecter avec GuideService.findById()
    return {} as GuideResponse;
  }

  // ─────────────────────────────────────
  // POST /guides
  // Créer un profil guide
  // ─────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateGuideDto,
    @Req() req: Request,
  ): Promise<GuideResponse> {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;

    // TODO: connecter avec GuideService.create()
    return {} as GuideResponse;
  }

  // ─────────────────────────────────────
  // PUT /guides/:id
  // Mettre à jour un profil guide
  // ─────────────────────────────────────

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGuideDto,
    @Req() req: Request,
  ): Promise<GuideResponse> {
    AuthMiddleware.requireAuth(req);

    // TODO: connecter avec GuideService.update()
    return {} as GuideResponse;
  }

  // ─────────────────────────────────────
  // PUT /guides/:id/verify
  // Vérifier un guide (admin)
  // ─────────────────────────────────────

  @Put(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ verified: boolean }> {
    AuthMiddleware.requireAdmin(req);

    // TODO: connecter avec GuideService.verify()
    return { verified: true };
  }

  // ─────────────────────────────────────
  // DELETE /guides/:id
  // Supprimer un guide (admin)
  // ─────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    AuthMiddleware.requireAdmin(req);

    // TODO: connecter avec GuideService.delete()
  }

  // ─────────────────────────────────────
  // GET /guides/:id/availability
  // Disponibilité d'un guide
  // ─────────────────────────────────────

  @Get(':id/availability')
  @HttpCode(HttpStatus.OK)
  async getAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
  ): Promise<{
    available: boolean;
    slots: string[];
  }> {
    // TODO: vérifier le calendrier du guide en DB
    return {
      available: true,
      slots: ['09:00', '14:00'],
    };
  }

  // ─────────────────────────────────────
  // GET /guides/:id/reviews
  // Avis d'un guide
  // ─────────────────────────────────────

  @Get(':id/reviews')
  @HttpCode(HttpStatus.OK)
  async getReviews(
    @Param('id') id: string,
    @Query() query: any,
  ): Promise<{ reviews: any[]; total: number }> {
    // TODO: connecter avec ReviewService
    return { reviews: [], total: 0 };
  }
}