import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AvatarService,
  AvatarChatRequest,
  AvatarGender,
  AvatarLanguage,
} from './avatar.service';

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

class AvatarChatBody {
  message: string;
  avatarGender: AvatarGender;
  destination?: string;
  conversationHistory?: { role: string; content: string }[];
}

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  // ─────────────────────────────────────
  // GET /avatar/profiles
  // Récupérer les profils des avatars
  // ─────────────────────────────────────

  @Get('profiles')
  @HttpCode(HttpStatus.OK)
  getProfiles() {
    return this.avatarService.getProfiles();
  }

  // ─────────────────────────────────────
  // GET /avatar/welcome
  // Message de bienvenue
  // ─────────────────────────────────────

  @Get('welcome')
  @HttpCode(HttpStatus.OK)
  async getWelcome(
    @Query('gender') gender: AvatarGender = 'female',
    @Query('destination') destination: string,
    @Req() req: Request,
  ) {
    const language = ((req as any).language || 'en') as AvatarLanguage;
    return this.avatarService.getWelcomeMessage(language, gender, destination);
  }

  // ─────────────────────────────────────
  // POST /avatar/chat
  // Chat avec l'avatar IA
  // ─────────────────────────────────────

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() body: AvatarChatBody,
    @Req() req: Request,
  ) {
    const language = ((req as any).language || 'en') as AvatarLanguage;
    const userId = (req as any).user?.id;

    const chatReq: AvatarChatRequest = {
      message: body.message,
      language,
      destination: body.destination,
      avatarGender: body.avatarGender || 'female',
      conversationHistory: body.conversationHistory,
      userId,
    };

    return this.avatarService.chat(chatReq);
  }
}