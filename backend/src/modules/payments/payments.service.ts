import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
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

    const isSandboxOrder = dto.razorpayOrderId.startsWith('order_sand_');

    if (!isSandboxOrder && this.isConfigured) {
      const generatedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== dto.razorpaySignature) {
        this.logger.warn(
          `Invalid signature for order ${dto.orderId}. Expected ${generatedSignature}, got ${dto.razorpaySignature}`,
        );
        throw new BadRequestException('Payment signature verification failed');
      }
    }

    // Update or create transaction entry
    const existingTx = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: order.id,
        gatewayOrderId: dto.razorpayOrderId,
      },
      orderBy: { createdAt: 'desc' },
    });

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
   * Webhook listener for Razorpay async server-to-server notifications
   */
  async handleRazorpayWebhook(rawBody: string, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id: string;
            order_id: string;
            amount: number;
            status: string;
          };
        };
      };
    };

    if (
      payload.event === 'payment.captured' &&
      payload.payload?.payment?.entity
    ) {
      const p = payload.payload.payment.entity;
      const tx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayOrderId: p.order_id },
      });

      if (tx) {
        await this.prisma.$transaction(async (prismaTx) => {
          await prismaTx.paymentTransaction.update({
            where: { id: tx.id },
            data: {
              status: TransactionStatus.SUCCESS,
              gatewayPaymentId: p.id,
            },
          });
          await prismaTx.order.update({
            where: { id: tx.orderId },
            data: { paymentStatus: PaymentStatus.PAID },
          });
        });
      }
    }

    return { status: 'ok' };
  }
}
