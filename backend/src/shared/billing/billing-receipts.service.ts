import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentStatus, PartnerSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  renderOrderReceiptHtml,
  renderSubscriptionReceiptHtml,
} from './gst-receipt';

@Injectable()
export class BillingReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async orderReceiptHtml(buyerUserId: string, orderId: string): Promise<string> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerUserId },
      include: {
        vendorOrganization: { select: { companyName: true } },
        lineItems: true,
        transactions: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new UnprocessableEntityException(
        'Receipt is available only for paid orders',
      );
    }
    const tx = order.transactions[0];
    const billingLines = [
      `${order.billingAddressLine1}, ${order.billingCity}, ${order.billingState} ${order.billingPincode}`,
    ];
    for (const li of order.lineItems) {
      billingLines.push(
        `${li.snapshotName} × ${li.quantity} @ ₹${li.unitPriceInr.toFixed(2)}`,
      );
    }
    return renderOrderReceiptHtml({
      receiptNo: order.id.slice(0, 8).toUpperCase(),
      issuedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      buyerCompany: order.companyName,
      buyerGstin: order.gstin,
      vendorCompany: order.vendorOrganization.companyName,
      billingLines,
      subtotalInr: order.subtotalInr.toFixed(2),
      taxInr: order.taxInr.toFixed(2),
      shippingInr: order.shippingInr.toFixed(2),
      totalInr: order.totalInr.toFixed(2),
      paymentStatus: order.paymentStatus,
      gatewayPaymentId: tx?.gatewayPaymentId ?? null,
    });
  }

  async subscriptionReceiptHtml(partnerUserId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: partnerUserId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const sub = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    if (
      !sub ||
      sub.status !== PartnerSubscriptionStatus.ACTIVE ||
      Number(sub.plan.priceInr) <= 0
    ) {
      throw new UnprocessableEntityException(
        'Payment record is available for active paid subscriptions only',
      );
    }

    return renderSubscriptionReceiptHtml({
      receiptNo: sub.id.slice(0, 8).toUpperCase(),
      issuedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      partnerCompany: org.companyName,
      partnerGstin: org.gst,
      planName: sub.plan.name,
      billingPeriod: sub.plan.billingPeriod,
      amountInr: sub.plan.priceInr.toFixed(2),
      periodStart: sub.currentPeriodStart?.toLocaleDateString('en-IN') ?? null,
      periodEnd: sub.currentPeriodEnd?.toLocaleDateString('en-IN') ?? null,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
    });
  }
}
