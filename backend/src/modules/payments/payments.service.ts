import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  isProductionDeploy,
  verifyOrderPaymentSignature,
  verifyWebhookSignature,
} from '../../shared/razorpay/razorpay.util';
import {
  isSubscriptionEvent,
  PartnerBillingService,
  type SubscriptionWebhookEntity,
} from '../partner-billing/partner-billing.service';
import {
  AdminVerifyBankTransferDto,
  CreatePaymentIntentDto,
  SubmitBankTransferDto,
  VerifyRazorpayPaymentDto,
} from './dto/payment.dto';

export interface PaymentIntentResult {
  orderId: string;
  gateway: PaymentGateway;
  gatewayOrderId: string;
  amountPaise: number;
  amountInr: string;
  currency: string;
  keyId: string;
  sandboxMode: boolean;
  orderSummary: {
    companyName: string;
    contactName: string;
    contactPhone: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly partnerBilling: PartnerBillingService,
  ) {
    this.razorpayKeyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      process.env.RAZORPAY_KEY_ID ||
      '';
    this.razorpayKeySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      process.env.RAZORPAY_KEY_SECRET ||
      '';

    this.isConfigured =
      Boolean(this.razorpayKeyId) &&
      Boolean(this.razorpayKeySecret) &&
      !this.razorpayKeyId.includes('placeholder');

    if (this.isConfigured) {
      this.logger.log(
        `Razorpay configured in LIVE/TEST mode with Key ID: ${this.razorpayKeyId.slice(0, 8)}...`,
      );
    } else {
      this.logger.log(
        'Razorpay credentials not set; running in Seamless Sandbox Simulation Mode.',
      );
    }
  }

  /**
   * Create payment intent with Gateway (Razorpay or Sandbox simulation)
   */
  async createPaymentIntent(
    userId: string,
    userRole: UserRole,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userRole !== UserRole.PLATFORM_ADMIN && order.buyerUserId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to pay for this order',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Cannot initiate payment for a cancelled order',
      );
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new UnprocessableEntityException(
        'This order is already marked as PAID',
      );
    }

    const amountInr = order.totalInr.toNumber();
    const amountPaise = Math.round(amountInr * 100);

    let gatewayOrderId = '';
    let sandboxMode = false;

    if (!this.isConfigured && isProductionDeploy()) {
      throw new ServiceUnavailableException(
        'Online payment is not available right now. Use bank transfer or contact support.',
      );
    }

    if (this.isConfigured) {
      try {
        const auth = Buffer.from(
          `${this.razorpayKeyId}:${this.razorpayKeySecret}`,
        ).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `order_${order.id.slice(0, 12)}`,
            notes: {
              garudOrderId: order.id,
              buyerUserId: userId,
              companyName: order.companyName,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          this.logger.error(`Razorpay order creation failed: ${errBody}`);
          throw new Error(`Razorpay API error: ${response.statusText}`);
        }

        const data = (await response.json()) as { id: string };
        gatewayOrderId = data.id;
      } catch (err) {
        if (isProductionDeploy()) {
          // Never simulate a payment where real money is involved.
          this.logger.error(
            `Razorpay order creation failed: ${(err as Error).message}`,
          );
          throw new BadGatewayException(
            'Could not start the payment with the gateway. Please try again.',
          );
        }
        this.logger.warn(
          `Failed to contact Razorpay API, falling back to sandbox: ${(err as Error).message}`,
        );
        gatewayOrderId = `order_sand_${crypto.randomBytes(8).toString('hex')}`;
        sandboxMode = true;
      }
    } else {
      gatewayOrderId = `order_sand_${crypto.randomBytes(8).toString('hex')}`;
      sandboxMode = true;
    }

    // Record transaction initiation in database
    await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        gateway: PaymentGateway.RAZORPAY,
        gatewayOrderId,
        amountInr: order.totalInr,
        currency: 'INR',
        status: TransactionStatus.CREATED,
        metadata: {
          sandboxMode,
          initiatedByUserId: userId,
          amountPaise,
        },
      },
    });

    return {
      orderId: order.id,
      gateway: PaymentGateway.RAZORPAY,
      gatewayOrderId,
      amountPaise,
      amountInr: order.totalInr.toFixed(2),
      currency: 'INR',
      keyId: this.isConfigured
        ? this.razorpayKeyId
        : 'rzp_test_garudhub_sandbox',
      sandboxMode,
      orderSummary: {
        companyName: order.companyName,
        contactName: order.contactName,
        contactPhone: order.contactPhone,
      },
    };
  }

  /**
   * Verify Razorpay payment signature and update order status to PAID
   */
  async verifyRazorpayPayment(
    userId: string,
    userRole: UserRole,
    dto: VerifyRazorpayPaymentDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userRole !== UserRole.PLATFORM_ADMIN && order.buyerUserId !== userId) {
      throw new ForbiddenException('Access denied for this order');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Order is already marked as PAID.',
        orderId: order.id,
        paymentStatus: PaymentStatus.PAID,
        paymentId: dto.razorpayPaymentId,
      };
    }

    // The gateway order must have been created by our own intent for THIS order.
    // (A valid signature only proves the payment belongs to *some* order of the merchant.)
    const existingTx = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: order.id,
        gatewayOrderId: dto.razorpayOrderId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!existingTx) {
      throw new BadRequestException(
        'Payment does not match an open payment intent for this order',
      );
    }

    const isSandboxOrder = dto.razorpayOrderId.startsWith('order_sand_');
    if (isSandboxOrder) {
      const meta = (existingTx.metadata ?? {}) as { sandboxMode?: boolean };
      if (isProductionDeploy() || meta.sandboxMode !== true) {
        this.logger.warn(
          `Rejected sandbox payment verification for order ${dto.orderId}`,
        );
        throw new BadRequestException('Sandbox payments are not accepted here');
      }
    } else {
      if (!this.isConfigured) {
        throw new ServiceUnavailableException(
          'Payment gateway is not configured',
        );
      }
      if (
        !verifyOrderPaymentSignature(
          dto.razorpayOrderId,
          dto.razorpayPaymentId,
          dto.razorpaySignature,
          this.razorpayKeySecret,
        )
      ) {
        this.logger.warn(`Invalid payment signature for order ${dto.orderId}`);
        throw new BadRequestException('Payment signature verification failed');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (existingTx) {
        await tx.paymentTransaction.update({
          where: { id: existingTx.id },
          data: {
            gatewayPaymentId: dto.razorpayPaymentId,
            gatewaySignature: dto.razorpaySignature,
            status: TransactionStatus.SUCCESS,
            paymentMethod: isSandboxOrder
              ? 'sandbox_instant'
              : 'online_razorpay',
          },
        });
      } else {
        await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            gateway: PaymentGateway.RAZORPAY,
            gatewayOrderId: dto.razorpayOrderId,
            gatewayPaymentId: dto.razorpayPaymentId,
            gatewaySignature: dto.razorpaySignature,
            amountInr: order.totalInr,
            currency: 'INR',
            status: TransactionStatus.SUCCESS,
            paymentMethod: isSandboxOrder
              ? 'sandbox_instant'
              : 'online_razorpay',
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
        },
      });
    });

    return {
      success: true,
      message: 'Payment verified successfully. Order marked as PAID.',
      orderId: order.id,
      paymentStatus: PaymentStatus.PAID,
      paymentId: dto.razorpayPaymentId,
    };
  }

  /**
   * Submit Corporate B2B Bank Transfer (NEFT/RTGS UTR Reference)
   */
  async submitBankTransfer(
    userId: string,
    userRole: UserRole,
    dto: SubmitBankTransferDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userRole !== UserRole.PLATFORM_ADMIN && order.buyerUserId !== userId) {
      throw new ForbiddenException('Access denied for this order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Cannot submit transfer for a cancelled order',
      );
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new UnprocessableEntityException(
        'This order is already marked as PAID',
      );
    }

    const cleanUtr = dto.utrNumber.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // Concurrency safety: acquire transaction-scoped advisory lock on the normalized UTR
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleanUtr}))`;

      // Enforce global UTR uniqueness across all orders for active transactions
      const existing = await tx.paymentTransaction.findFirst({
        where: {
          utrNumber: cleanUtr,
          status: {
            in: [
              TransactionStatus.PROCESSING,
              TransactionStatus.SUCCESS,
              TransactionStatus.REFUNDED,
            ],
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          'This bank transfer reference (UTR) has already been submitted or processed.',
        );
      }

      const createdTx = await tx.paymentTransaction.create({
        data: {
          orderId: order.id,
          gateway: PaymentGateway.BANK_TRANSFER_NEFT_RTGS,
          utrNumber: cleanUtr,
          senderBankName: dto.senderBankName?.trim(),
          amountInr: order.totalInr,
          currency: 'INR',
          status: TransactionStatus.PROCESSING,
          paymentMethod: 'neft_rtgs_wire',
          metadata: {
            submittedByUserId: userId,
            notes: dto.notes?.trim(),
            submittedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message:
          'Bank transfer reference (UTR) submitted for admin reconciliation.',
        transaction: {
          id: createdTx.id,
          orderId: createdTx.orderId,
          utrNumber: createdTx.utrNumber,
          senderBankName: createdTx.senderBankName,
          status: createdTx.status,
          amountInr: createdTx.amountInr.toFixed(2),
          createdAt: createdTx.createdAt.toISOString(),
        },
      };
    });
  }

  /**
   * Platform Admin verifies and settles or rejects a Bank Transfer UTR
   */
  async adminVerifyBankTransfer(
    adminUserId: string,
    dto: AdminVerifyBankTransferDto,
  ) {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { id: dto.transactionId },
      include: { order: true },
    });

    if (!tx) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (tx.order.status === OrderStatus.CANCELLED) {
      throw new UnprocessableEntityException(
        'Cannot verify payment for a cancelled order',
      );
    }

    if (tx.status === TransactionStatus.SUCCESS) {
      throw new BadRequestException(
        'Payment transaction has already been approved and settled',
      );
    }

    if (tx.status === TransactionStatus.FAILED) {
      throw new BadRequestException(
        'Payment transaction has already been rejected',
      );
    }

    if (dto.action === 'APPROVE') {
      await this.prisma.$transaction(async (prismaTx) => {
        await prismaTx.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: TransactionStatus.SUCCESS,
            metadata: {
              ...(typeof tx.metadata === 'object' && tx.metadata !== null
                ? tx.metadata
                : {}),
              verifiedByAdminUserId: adminUserId,
              verifiedAt: new Date().toISOString(),
            },
          },
        });

        await prismaTx.order.update({
          where: { id: tx.orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      });

      return {
        success: true,
        message: `UTR ${tx.utrNumber || tx.id} verified and approved. Order marked as PAID.`,
        transactionStatus: TransactionStatus.SUCCESS,
        orderPaymentStatus: PaymentStatus.PAID,
      };
    } else {
      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          status: TransactionStatus.FAILED,
          failureReason:
            dto.rejectionReason ||
            'Rejected by platform admin during bank reconciliation',
          metadata: {
            ...(typeof tx.metadata === 'object' && tx.metadata !== null
              ? tx.metadata
              : {}),
            rejectedByAdminUserId: adminUserId,
            rejectedAt: new Date().toISOString(),
            rejectionReason: dto.rejectionReason,
          },
        },
      });

      return {
        success: true,
        message: `UTR ${tx.utrNumber || tx.id} was rejected.`,
        transactionStatus: TransactionStatus.FAILED,
        orderPaymentStatus: tx.order.paymentStatus,
      };
    }
  }

  /**
   * Get all transactions for an order
   */
  async getOrderTransactions(orderId: string) {
    const rows = await this.prisma.paymentTransaction.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      gateway: r.gateway,
      gatewayOrderId: r.gatewayOrderId,
      gatewayPaymentId: r.gatewayPaymentId,
      utrNumber: r.utrNumber,
      senderBankName: r.senderBankName,
      amountInr: r.amountInr.toFixed(2),
      currency: r.currency,
      status: r.status,
      paymentMethod: r.paymentMethod,
      failureReason: r.failureReason,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Razorpay webhook (server-to-server). Requires a valid `x-razorpay-signature` over the
   * RAW body. Idempotent: replays of an already-applied event are no-ops.
   */
  async handleRazorpayWebhook(rawBody: string, signature?: string) {
    const webhookSecret = this.configService.get<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    if (webhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        throw new BadRequestException('Invalid webhook signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        'Webhook received but RAZORPAY_WEBHOOK_SECRET is unset',
      );
      throw new ServiceUnavailableException('Webhook is not configured');
    } else {
      this.logger.warn(
        'RAZORPAY_WEBHOOK_SECRET unset: accepting UNSIGNED webhook (non-production only)',
      );
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON');
    }

    const event = payload.event;
    const body = payload.payload ?? {};

    if (isSubscriptionEvent(event) && body.subscription?.entity) {
      const res = await this.partnerBilling.handleSubscriptionEvent(
        event,
        body.subscription.entity,
      );
      return { status: 'ok', event, handled: res.handled };
    }

    if (
      (event === 'payment.captured' || event === 'order.paid') &&
      body.payment?.entity
    ) {
      return {
        status: 'ok',
        event,
        handled: await this.applyCapturedPayment(body.payment.entity),
      };
    }

    if (event === 'payment.failed' && body.payment?.entity) {
      const p = body.payment.entity;
      const tx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayOrderId: p.order_id },
        orderBy: { createdAt: 'desc' },
      });
      if (tx && tx.status !== TransactionStatus.SUCCESS) {
        await this.prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: TransactionStatus.FAILED,
            gatewayPaymentId: p.id,
            failureReason:
              p.error_description ??
              p.error_code ??
              'Payment failed at gateway',
          },
        });
        return { status: 'ok', event, handled: true };
      }
      return { status: 'ok', event, handled: false };
    }

    if (event === 'refund.processed' && body.refund?.entity) {
      const r = body.refund.entity;
      const tx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayPaymentId: r.payment_id },
        orderBy: { createdAt: 'desc' },
      });
      if (tx && tx.status === TransactionStatus.SUCCESS) {
        const full = r.amount >= Math.round(tx.amountInr.toNumber() * 100);
        await this.prisma.$transaction(async (prismaTx) => {
          await prismaTx.paymentTransaction.update({
            where: { id: tx.id },
            data: { status: TransactionStatus.REFUNDED },
          });
          if (full) {
            await prismaTx.order.update({
              where: { id: tx.orderId },
              data: { paymentStatus: PaymentStatus.REFUNDED },
            });
          }
        });
        return { status: 'ok', event, handled: true };
      }
      return { status: 'ok', event, handled: false };
    }

    // Unknown / uninteresting events still get a 200 so Razorpay stops retrying.
    return { status: 'ok', event, handled: false };
  }

  private async applyCapturedPayment(p: RazorpayPaymentEntity) {
    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { gatewayOrderId: p.order_id },
      orderBy: { createdAt: 'desc' },
    });
    if (!tx) {
      this.logger.warn(
        `Captured payment ${p.id} for unknown order ${p.order_id}`,
      );
      return false;
    }
    if (tx.status === TransactionStatus.SUCCESS) return false; // replay

    const expectedPaise = Math.round(tx.amountInr.toNumber() * 100);
    if (p.amount !== expectedPaise) {
      this.logger.error(
        `Amount mismatch for ${p.order_id}: gateway ${p.amount} vs expected ${expectedPaise}; NOT marking paid`,
      );
      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          failureReason: `Webhook amount mismatch (${p.amount} vs ${expectedPaise} paise) — manual review`,
        },
      });
      return false;
    }

    await this.prisma.$transaction(async (prismaTx) => {
      await prismaTx.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          status: TransactionStatus.SUCCESS,
          gatewayPaymentId: p.id,
          paymentMethod: tx.paymentMethod ?? 'online_razorpay',
        },
      });
      await prismaTx.order.update({
        where: { id: tx.orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
    });
    return true;
  }
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  status?: string;
  error_code?: string;
  error_description?: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: { payment_id: string; amount: number } };
    subscription?: { entity?: SubscriptionWebhookEntity };
  };
}
