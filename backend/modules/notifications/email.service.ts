import { Injectable, Logger } from '@nestjs/common';

export type EmailTemplate = 'booking_confirmed' | 'booking_cancelled' | 'payment_success' | 'payment_failed' | 'welcome' | 'reset_password' | 'trip_ready';

export interface EmailPayload {
  to: string;
  language?: string;
  data?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(template: EmailTemplate, payload: EmailPayload): Promise<void> {
    this.logger.log('Email: ' + template + ' -> ' + payload.to + ' [' + (payload.language || 'en') + ']');
  }
}
