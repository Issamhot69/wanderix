import { Injectable, Logger } from '@nestjs/common';

export type PushTemplate = 'booking_confirmed' | 'booking_cancelled' | 'payment_success' | 'payment_failed' | 'trip_ready' | 'guide_assigned' | 'new_message' | 'promo_offer';

export interface PushPayload {
  token: string;
  language?: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface PushMulticastPayload {
  tokens: string[];
  language?: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(template: PushTemplate, payload: PushPayload): Promise<void> {
    this.logger.log('Push: ' + template + ' -> ' + payload.token.slice(0, 20));
  }

  async sendMulticast(template: PushTemplate, payload: PushMulticastPayload): Promise<{ success: number; failure: number }> {
    this.logger.log('Multicast Push: ' + template + ' -> ' + payload.tokens.length + ' devices');
    return { success: payload.tokens.length, failure: 0 };
  }
}
