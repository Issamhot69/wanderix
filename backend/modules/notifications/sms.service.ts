import { Injectable, Logger } from '@nestjs/common';

export type SmsTemplate = 'booking_confirmed' | 'booking_cancelled' | 'payment_success' | 'otp_code' | 'trip_ready';

export interface SmsPayload {
  to: string;
  language?: string;
  data?: Record<string, any>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(template: SmsTemplate, payload: SmsPayload): Promise<void> {
    this.logger.log('SMS: ' + template + ' -> ' + payload.to);
  }

  async sendOtp(phone: string, language: string = 'en'): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.send('otp_code', { to: phone, language, data: { code } });
    return code;
  }
}
