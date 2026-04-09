import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { WalletService } from './wallet.service';
import { AuthMiddleware } from '../auth/auth.middleware';

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

class CreatePaymentIntentBody {
  amount: number;
  currency: string;
  bookingId: string;
}

class RefundBody {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

// ─────────────────────────────────────────
// Controller
// ─────────────────────────────────────────

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly walletService: WalletService,
  ) {}

  // ─────────────────────────────────────
  // POST /payments/intent
  // Créer un Payment Intent Stripe
  // ─────────────────────────────────────

  @Post('intent')
  @HttpCode(HttpStatus.CREATED)
  async createIntent(
    @Body() body: CreatePaymentIntentBody,
    @Req() req: Request,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }> {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;

    return this.stripeService.createPaymentIntent({
      amount: body.amount,
      currency: body.currency,
      bookingId: body.bookingId,
      userId,
    });
  }

  // ─────────────────────────────────────
  // GET /payments/intent/:id
  // Vérifier le statut d'un paiement
  // ─────────────────────────────────────

  @Get('intent/:id')
  @HttpCode(HttpStatus.OK)
  async getIntentStatus(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ status: string; paid: boolean }> {
    AuthMiddleware.requireAuth(req);
    return this.stripeService.confirmPayment(id);
  }

  // ─────────────────────────────────────
  // POST /payments/refund
  // Rembourser un paiement
  // ─────────────────────────────────────

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  async refund(
    @Body() body: RefundBody,
    @Req() req: Request,
  ): Promise<{ refundId: string; amount: number; status: string }> {
    AuthMiddleware.requireAdmin(req);

    return this.stripeService.refund({
      paymentIntentId: body.paymentIntentId,
      amount: body.amount,
      reason: body.reason,
    });
  }

  // ─────────────────────────────────────
  // GET /payments/wallet
  // Wallet du user connecté
  // ─────────────────────────────────────

  @Get('wallet')
  @HttpCode(HttpStatus.OK)
  async getWallet(@Req() req: Request): Promise<any> {
    AuthMiddleware.requireAuth(req);
    const userId = req.user!.id;
    return this.walletService.findByUser(userId);
  }

  // ─────────────────────────────────────
  // GET /payments/wallet/admin/total
  // Solde total de tous les wallets (admin)
  // ─────────────────────────────────────

  @Get('wallet/admin/total')
  @HttpCode(HttpStatus.OK)
  async getWalletTotal(@Req() req: Request): Promise<{
    totalBalance: number;
    totalWallets: number;
    currency: string;
  }> {
    AuthMiddleware.requireAdmin(req);
    return this.walletService.getTotalBalance();
  }

  // ─────────────────────────────────────
  // POST /payments/webhook
  // Stripe Webhook — événements automatiques
  // ─────────────────────────────────────

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody!,
        signature,
      );

      // Traiter les événements Stripe
      switch (event.type) {

        case 'payment_intent.succeeded': {
          const intent = event.data.object as any;
          const bookingId = intent.metadata?.bookingId;
          // TODO: confirmer la réservation en DB
          console.log(`✅ Payment succeeded for booking: ${bookingId}`);
          break;
        }

        case 'payment_intent.payment_failed': {
          const intent = event.data.object as any;
          const bookingId = intent.metadata?.bookingId;
          // TODO: marquer la réservation comme failed
          console.log(`❌ Payment failed for booking: ${bookingId}`);
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as any;
          const bookingId = charge.metadata?.bookingId;
          const userId = charge.metadata?.userId;
          // TODO: créditer le wallet du user
          if (userId && bookingId) {
            await this.walletService.refund(
              userId,
              charge.amount_refunded / 100,
              bookingId,
            );
          }
          console.log(`💰 Refund processed for booking: ${bookingId}`);
          break;
        }

        case 'account.updated': {
          // Stripe Connect — partenaire vérifié
          const account = event.data.object as any;
          console.log(`🏦 Partner account updated: ${account.id}`);
          // TODO: mettre à jour le statut partenaire en DB
          break;
        }

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }

      return { received: true };

    } catch (error) {
      console.error(`Webhook error: ${error.message}`);
      return { received: false };
    }
  }
}