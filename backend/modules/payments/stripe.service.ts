import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  bookingId: string;
  userId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RefundDto {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

// ─────────────────────────────────────────
// Service Stripe
// ─────────────────────────────────────────

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10',
    });
  }

  // ─────────────────────────────────────
  // Créer un Payment Intent
  // ─────────────────────────────────────

  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponse> {
    try {
      const amountInCents = Math.round(dto.amount * 100);

      const intent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: dto.currency.toLowerCase(),
        metadata: {
          bookingId: dto.bookingId,
          userId: dto.userId,
          platform: 'wanderix',
          ...dto.metadata,
        },
        automatic_payment_methods: { enabled: true },
      });

      this.logger.log(
        `PaymentIntent created: ${intent.id} — ${dto.amount} ${dto.currency}`,
      );

      return {
        clientSecret: intent.client_secret!,
        paymentIntentId: intent.id,
        amount: dto.amount,
        currency: dto.currency,
        status: intent.status,
      };

    } catch (error) {
      this.logger.error(`createPaymentIntent failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Confirmer un paiement
  // ─────────────────────────────────────

  async confirmPayment(paymentIntentId: string): Promise<{
    status: string;
    paid: boolean;
  }> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        status: intent.status,
        paid: intent.status === 'succeeded',
      };

    } catch (error) {
      this.logger.error(`confirmPayment failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Rembourser un paiement
  // ─────────────────────────────────────

  async refund(dto: RefundDto): Promise<{
    refundId: string;
    amount: number;
    status: string;
  }> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: dto.paymentIntentId,
        reason: dto.reason || 'requested_by_customer',
      };

      if (dto.amount) {
        refundData.amount = Math.round(dto.amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      this.logger.log(`Refund created: ${refund.id}`);

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status!,
      };

    } catch (error) {
      this.logger.error(`refund failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Créer un Customer Stripe
  // ─────────────────────────────────────

  async createCustomer(user: {
    id: string;
    email: string;
    name: string;
  }): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { wanderixUserId: user.id },
      });

      this.logger.log(`Stripe customer created: ${customer.id}`);
      return customer.id;

    } catch (error) {
      this.logger.error(`createCustomer failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Webhook — vérifier la signature
  // ─────────────────────────────────────

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }

  // ─────────────────────────────────────
  // Créer un Connect Account (partenaire)
  // ─────────────────────────────────────

  async createConnectAccount(partner: {
    email: string;
    country: string;
  }): Promise<string> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: partner.email,
        country: partner.country,
        capabilities: {
          transfers: { requested: true },
        },
      });

      this.logger.log(`Stripe Connect account created: ${account.id}`);
      return account.id;

    } catch (error) {
      this.logger.error(`createConnectAccount failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Payout vers partenaire (Stripe Connect)
  // ─────────────────────────────────────

  async transferToPartner(
    stripeAccountId: string,
    amount: number,
    currency: string,
    bookingId: string,
  ): Promise<{ transferId: string }> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination: stripeAccountId,
        metadata: { bookingId, platform: 'wanderix' },
      });

      this.logger.log(
        `Transfer to partner: ${transfer.id} — ${amount} ${currency}`,
      );

      return { transferId: transfer.id };

    } catch (error) {
      this.logger.error(`transferToPartner failed: ${error.message}`);
      throw error;
    }
  }
}
