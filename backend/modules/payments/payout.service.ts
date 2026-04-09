import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface PayoutRequest {
  partnerId: string;
  stripeAccountId: string;
  amount: number;
  currency: string;
  bookingId: string;
}

export interface PayoutResult {
  payoutId: string;
  partnerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  transferId: string;
  processedAt: Date;
}

export interface PayoutSummary {
  totalPayouts: number;
  totalAmount: number;
  pending: number;
  completed: number;
  failed: number;
  currency: string;
}

// ─────────────────────────────────────────
// Service Payout
// ─────────────────────────────────────────

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  // Seuil minimum de payout (évite les micro-transferts)
  private readonly MIN_PAYOUT_AMOUNT = 10.00;

  constructor(
    private readonly stripeService: StripeService,
  ) {}

  // ─────────────────────────────────────
  // Effectuer un payout vers un partenaire
  // ─────────────────────────────────────

  async processPayout(req: PayoutRequest): Promise<PayoutResult> {
    try {
      // 1. Valider le montant minimum
      if (req.amount < this.MIN_PAYOUT_AMOUNT) {
        throw new BadRequestException(
          `Payout amount ${req.amount} is below minimum ${this.MIN_PAYOUT_AMOUNT}`,
        );
      }

      // 2. Vérifier que le partenaire a un compte Stripe Connect
      if (!req.stripeAccountId) {
        throw new BadRequestException(
          `Partner ${req.partnerId} has no Stripe Connect account`,
        );
      }

      // 3. Effectuer le transfert via Stripe Connect
      const { transferId } = await this.stripeService.transferToPartner(
        req.stripeAccountId,
        req.amount,
        req.currency,
        req.bookingId,
      );

      // 4. Enregistrer le payout en DB
      const payout: PayoutResult = {
        payoutId: crypto.randomUUID(),
        partnerId: req.partnerId,
        amount: req.amount,
        currency: req.currency,
        status: 'completed',
        transferId,
        processedAt: new Date(),
      };

      // TODO: save to DB
      this.logger.log(
        `Payout processed: partner ${req.partnerId} ` +
        `+${req.amount} ${req.currency} → transfer: ${transferId}`,
      );

      return payout;

    } catch (error) {
      this.logger.error(`processPayout failed: ${error.message}`);

      // TODO: enregistrer le payout échoué en DB
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Payout automatique après booking complété
  // ─────────────────────────────────────

  async processBookingPayout(bookingId: string): Promise<PayoutResult | null> {
    try {
      // 1. Récupérer les infos de la réservation
      // TODO: récupérer depuis la DB
      const booking = {
        id: bookingId,
        partnerId: 'partner-id',
        stripeAccountId: 'acct_xxx',
        baseAmount: 100,
        commissionAmount: 12,
        currency: 'USD',
      };

      // 2. Calculer le montant du payout (base - commission)
      const payoutAmount = this.round(
        booking.baseAmount - booking.commissionAmount,
      );

      // 3. Effectuer le payout
      return await this.processPayout({
        partnerId: booking.partnerId,
        stripeAccountId: booking.stripeAccountId,
        amount: payoutAmount,
        currency: booking.currency,
        bookingId,
      });

    } catch (error) {
      this.logger.error(`processBookingPayout failed: ${error.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────
  // Payouts en attente (batch)
  // ─────────────────────────────────────

  async processPendingPayouts(): Promise<{
    processed: number;
    failed: number;
    totalAmount: number;
  }> {
    try {
      // TODO: récupérer les payouts en attente depuis la DB
      const pendingPayouts: PayoutRequest[] = [];

      let processed = 0;
      let failed = 0;
      let totalAmount = 0;

      for (const payout of pendingPayouts) {
        try {
          await this.processPayout(payout);
          processed++;
          totalAmount += payout.amount;
        } catch {
          failed++;
          this.logger.error(`Batch payout failed for partner: ${payout.partnerId}`);
        }
      }

      this.logger.log(
        `Batch payouts: ${processed} processed, ${failed} failed, ` +
        `total: ${totalAmount}`,
      );

      return { processed, failed, totalAmount };

    } catch (error) {
      this.logger.error(`processPendingPayouts failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Historique des payouts d'un partenaire
  // ─────────────────────────────────────

  async getPartnerPayouts(
    partnerId: string,
    options: {
      page?: number;
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
    } = {},
  ): Promise<{ payouts: PayoutResult[]; total: number }> {
    try {
      // TODO: requête DB avec filtres
      return { payouts: [], total: 0 };
    } catch (error) {
      this.logger.error(`getPartnerPayouts failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Résumé des payouts (admin)
  // ─────────────────────────────────────

  async getSummary(
    fromDate: Date,
    toDate: Date,
  ): Promise<PayoutSummary> {
    try {
      // TODO: agrégation DB
      return {
        totalPayouts: 0,
        totalAmount: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        currency: 'USD',
      };
    } catch (error) {
      this.logger.error(`getSummary failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Onboarding partenaire Stripe Connect
  // ─────────────────────────────────────

  async onboardPartner(partner: {
    id: string;
    email: string;
    country: string;
  }): Promise<{ stripeAccountId: string }> {
    try {
      const stripeAccountId = await this.stripeService.createConnectAccount({
        email: partner.email,
        country: partner.country,
      });

      // TODO: sauvegarder stripeAccountId en DB pour ce partenaire
      this.logger.log(
        `Partner ${partner.id} onboarded: ${stripeAccountId}`,
      );

      return { stripeAccountId };

    } catch (error) {
      this.logger.error(`onboardPartner failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Helper
  // ─────────────────────────────────────

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}