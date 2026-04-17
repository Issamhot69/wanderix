import { Injectable, Logger } from '@nestjs/common';
// import { BookingType } from './booking.model';
type BookingType = 'hotel' | 'flight' | 'guide' | 'activity';
// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface CommissionInput {
  bookingType: BookingType;
  baseAmount: number;
  currency: string;
  partnerId?: string;
  isVip?: boolean;
}

export interface CommissionResult {
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  totalAmount: number;
  currency: string;
  breakdown: {
    wanderixFee: number;
    partnerPayout: number;
  };
}

// ─────────────────────────────────────────
// Taux de commission par type
// ─────────────────────────────────────────

const COMMISSION_RATES: Record<BookingType, number> = {
  hotel: 12.0,      // 12% sur les hôtels
  flight: 8.0,      // 8% sur les vols
  guide: 15.0,      // 15% sur les guides
  activity: 10.0,   // 10% sur les activités
};

// Taux réduits pour partenaires VIP
const VIP_DISCOUNT = 2.0; // -2% pour les partenaires VIP

// ─────────────────────────────────────────
// Commission Engine
// ─────────────────────────────────────────

@Injectable()
export class CommissionEngine {
  private readonly logger = new Logger(CommissionEngine.name);

  // ─────────────────────────────────────
  // Calculer la commission
  // ─────────────────────────────────────

  async calculate(input: CommissionInput): Promise<CommissionResult> {
    try {
      // 1. Récupérer le taux de base
      let commissionRate = COMMISSION_RATES[input.bookingType];

      // 2. Appliquer réduction VIP si applicable
      if (input.isVip) {
        commissionRate = Math.max(0, commissionRate - VIP_DISCOUNT);
      }

      // 3. Appliquer taux personnalisé partenaire si existant
      if (input.partnerId) {
        const partnerRate = await this.getPartnerRate(input.partnerId);
        if (partnerRate !== null) {
          commissionRate = partnerRate;
        }
      }

      // 4. Calculer les montants
      const commissionAmount = this.round(
        (input.baseAmount * commissionRate) / 100,
      );
      const totalAmount = this.round(input.baseAmount + commissionAmount);
      const partnerPayout = this.round(input.baseAmount - commissionAmount);

      const result: CommissionResult = {
        baseAmount: input.baseAmount,
        commissionRate,
        commissionAmount,
        totalAmount,
        currency: input.currency,
        breakdown: {
          wanderixFee: commissionAmount,
          partnerPayout,
        },
      };

      this.logger.log(
        `Commission calculated: ${commissionRate}% on ${input.baseAmount} ${input.currency} ` +
        `→ fee: ${commissionAmount}, payout: ${partnerPayout}`,
      );

      return result;

    } catch (error) {
      this.logger.error(`calculate commission failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Simuler une commission (avant booking)
  // ─────────────────────────────────────

  simulate(
    bookingType: BookingType,
    baseAmount: number,
    currency: string = 'USD',
  ): {
    commissionRate: number;
    commissionAmount: number;
    totalAmount: number;
    partnerPayout: number;
  } {
    const commissionRate = COMMISSION_RATES[bookingType];
    const commissionAmount = this.round((baseAmount * commissionRate) / 100);
    const totalAmount = this.round(baseAmount + commissionAmount);
    const partnerPayout = this.round(baseAmount - commissionAmount);

    return {
      commissionRate,
      commissionAmount,
      totalAmount,
      partnerPayout,
    };
  }

  // ─────────────────────────────────────
  // Rapport commission (admin)
  // ─────────────────────────────────────

  async getReport(
    fromDate: Date,
    toDate: Date,
  ): Promise<{
    totalCommissions: number;
    byType: Record<BookingType, number>;
    currency: string;
  }> {
    try {
      // TODO: agrégation DB
      return {
        totalCommissions: 0,
        byType: {
          hotel: 0,
          flight: 0,
          guide: 0,
          activity: 0,
        },
        currency: 'USD',
      };

    } catch (error) {
      this.logger.error(`getReport failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Taux par type (info publique)
  // ─────────────────────────────────────

  getRates(): Record<BookingType, number> {
    return { ...COMMISSION_RATES };
  }

  // ─────────────────────────────────────
  // Helpers privés
  // ─────────────────────────────────────

  private async getPartnerRate(partnerId: string): Promise<number | null> {
    // TODO: récupérer le taux personnalisé depuis la DB partners
    return null;
  }

  private round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}