import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface WalletModel {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'payout' | 'refund';
  amount: number;
  balanceAfter: number;
  description: Record<string, string>; // multilingue
  referenceId?: string;
  createdAt: Date;
}

export interface WalletResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

// ─────────────────────────────────────────
// Descriptions multilingues des transactions
// ─────────────────────────────────────────

const TRANSACTION_DESCRIPTIONS = {
  booking_refund: {
    en: 'Refund for cancelled booking',
    fr: 'Remboursement pour réservation annulée',
    ar: 'استرداد للحجز الملغى',
    es: 'Reembolso por reserva cancelada',
    de: 'Rückerstattung für stornierte Buchung',
    it: 'Rimborso per prenotazione annullata',
    zh: '取消预订退款',
    ja: 'キャンセルされた予約の返金',
  },
  partner_payout: {
    en: 'Partner payout',
    fr: 'Paiement partenaire',
    ar: 'دفع الشريك',
    es: 'Pago al socio',
    de: 'Partner-Auszahlung',
    it: 'Pagamento partner',
    zh: '合作伙伴付款',
    ja: 'パートナー支払い',
  },
  travel_credit: {
    en: 'Travel credit added',
    fr: 'Crédit voyage ajouté',
    ar: 'تمت إضافة رصيد السفر',
    es: 'Crédito de viaje añadido',
    de: 'Reiseguthaben hinzugefügt',
    it: 'Credito viaggio aggiunto',
    zh: '已添加旅行积分',
    ja: 'トラベルクレジットが追加されました',
  },
};

// ─────────────────────────────────────────
// Service Wallet
// ─────────────────────────────────────────

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  // ─────────────────────────────────────
  // Créer un wallet
  // ─────────────────────────────────────

  async create(userId: string, currency: string = 'USD'): Promise<WalletModel> {
    try {
      const wallet: WalletModel = {
        id: crypto.randomUUID(),
        userId,
        balance: 0,
        currency,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: save to DB
      this.logger.log(`Wallet created for user: ${userId}`);
      return wallet;

    } catch (error) {
      this.logger.error(`create wallet failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Récupérer le wallet d'un user
  // ─────────────────────────────────────

  async findByUser(userId: string): Promise<WalletResponse> {
    try {
      // TODO: requête DB
      const wallet: WalletModel | null = null;

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`);
      }

      const transactions = await this.getTransactions(wallet.id);

      return {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        currency: wallet.currency,
        transactions,
      };

    } catch (error) {
      this.logger.error(`findByUser wallet failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Créditer le wallet
  // ─────────────────────────────────────

  async credit(
    userId: string,
    amount: number,
    descriptionKey: keyof typeof TRANSACTION_DESCRIPTIONS,
    referenceId?: string,
  ): Promise<WalletTransaction> {
    try {
      if (amount <= 0) {
        throw new BadRequestException('Credit amount must be positive');
      }

      const wallet = await this.findByUser(userId);
      const newBalance = this.round(wallet.balance + amount);

      // TODO: update balance in DB (atomic transaction)
      const transaction: WalletTransaction = {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        type: 'credit',
        amount,
        balanceAfter: newBalance,
        description: TRANSACTION_DESCRIPTIONS[descriptionKey],
        referenceId,
        createdAt: new Date(),
      };

      // TODO: save transaction to DB
      this.logger.log(
        `Wallet credited: user ${userId} +${amount} → balance: ${newBalance}`,
      );

      return transaction;

    } catch (error) {
      this.logger.error(`credit wallet failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Débiter le wallet
  // ─────────────────────────────────────

  async debit(
    userId: string,
    amount: number,
    descriptionKey: keyof typeof TRANSACTION_DESCRIPTIONS,
    referenceId?: string,
  ): Promise<WalletTransaction> {
    try {
      if (amount <= 0) {
        throw new BadRequestException('Debit amount must be positive');
      }

      const wallet = await this.findByUser(userId);

      if (wallet.balance < amount) {
        throw new BadRequestException(
          `Insufficient balance: ${wallet.balance} ${wallet.currency}`,
        );
      }

      const newBalance = this.round(wallet.balance - amount);

      // TODO: update balance in DB (atomic transaction)
      const transaction: WalletTransaction = {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        type: 'debit',
        amount,
        balanceAfter: newBalance,
        description: TRANSACTION_DESCRIPTIONS[descriptionKey],
        referenceId,
        createdAt: new Date(),
      };

      // TODO: save transaction to DB
      this.logger.log(
        `Wallet debited: user ${userId} -${amount} → balance: ${newBalance}`,
      );

      return transaction;

    } catch (error) {
      this.logger.error(`debit wallet failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Rembourser vers le wallet
  // ─────────────────────────────────────

  async refund(
    userId: string,
    amount: number,
    bookingId: string,
  ): Promise<WalletTransaction> {
    return this.credit(userId, amount, 'booking_refund', bookingId);
  }

  // ─────────────────────────────────────
  // Historique des transactions
  // ─────────────────────────────────────

  async getTransactions(
    walletId: string,
    limit: number = 20,
  ): Promise<WalletTransaction[]> {
    try {
      // TODO: requête DB avec pagination
      return [];
    } catch (error) {
      this.logger.error(`getTransactions failed: ${error.message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────
  // Solde total (admin)
  // ─────────────────────────────────────

  async getTotalBalance(): Promise<{
    totalBalance: number;
    totalWallets: number;
    currency: string;
  }> {
    try {
      // TODO: agrégation DB
      return {
        totalBalance: 0,
        totalWallets: 0,
        currency: 'USD',
      };
    } catch (error) {
      this.logger.error(`getTotalBalance failed: ${error.message}`);
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