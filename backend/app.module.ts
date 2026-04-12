import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { LocaleMiddleware } from './modules/i18n/locale.middleware';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { LanguageDetector } from './modules/i18n/language.detector';
import { AiService } from './modules/ai/ai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
  ],
  providers: [
    LanguageDetector,
    AiService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LocaleMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}