import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PaymentGateway,
  PaymentStatus,
  PartnerSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  renderOrderReceiptHtml,
  renderSubscriptionReceiptHtml,
} from './gst-receipt';

const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function normalizeGstin(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toUpperCase();
  return t.length ? t : null;
}

function assertValidGstin(label: string, gstin: string | null): string {
  const g = normalizeGstin(gstin);
  if (!g || !GSTIN_RE.test(g)) {
    throw new UnprocessableEntityException(
      `${label} must be a valid 15-character GSTIN on your profile before a GST receipt can be generated.`,
    );
  }
  return g;
}

function assertValidHsn(lineLabel: string, hsn: string | null | undefined): string {
  const h = (hsn ?? '').trim();
  if (!/^[0-9]{4}([0-9]{2})?([0-9]{2})?$/.test(h)) {
    throw new UnprocessableEntityException(
      `Line "${lineLabel}" is missing a valid HSN code (4, 6, or 8 digits). Update the listing or contact support.`,
    );
  }
  return h;
}

@Injectable()
export class BillingReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async orderReceiptHtml(
    buyerUserId: string,
    orderId: string,
  ): Promise<string> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerUserId },
      include: {
        vendorOrganization: { select: { companyName: true, gst: true } },
        lineItems: true,
        transactions: {
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

    const buyerGstin = assertValidGstin('Buyer GSTIN', order.gstin);
    const vendorGstin = assertValidGstin(
      'Seller GSTIN',
      order.vendorOrganization.gst,
    );

    const billingLines = [
      `${order.billingAddressLine1}, ${order.billingCity}, ${order.billingState} ${order.billingPincode}`,
    ];
    const lines = order.lineItems.map((li) => {
      const lineLabel = `${li.snapshotName}${li.snapshotSku ? ` (${li.snapshotSku})` : ''}`;
      const hsn = assertValidHsn(lineLabel, li.snapshotHsnCode);
      return {
        description: lineLabel,
        quantity: li.quantity,
        unitPriceInr: li.unitPriceInr.toFixed(2),
        lineTotalInr: li.lineTotalInr.toFixed(2),
        hsnCode: hsn,
        gstRatePercent:
          li.snapshotGstPercent != null
            ? li.snapshotGstPercent.toFixed(2)
            : null,
        taxableValueInr: li.taxableValueInr?.toFixed(2) ?? null,
        cgstInr: li.cgstInr.toFixed(2),
        sgstInr: li.sgstInr.toFixed(2),
        igstInr: li.igstInr.toFixed(2),
      };
    });
    let paymentMethodLabel = 'Recorded payment';
    if (tx?.gateway === PaymentGateway.RAZORPAY) {
      paymentMethodLabel = 'Online / gateway';
    } else if (tx?.gateway === PaymentGateway.BANK_TRANSFER_NEFT_RTGS) {
      paymentMethodLabel = 'Bank transfer (NEFT/RTGS)';
    } else if (tx?.gateway === PaymentGateway.CASH_ON_DELIVERY) {
      paymentMethodLabel = 'Cash on delivery (settled offline)';
    }
    return renderOrderReceiptHtml({
      receiptNo: order.id.slice(0, 8).toUpperCase(),
      issuedAt: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      buyerCompany: order.companyName,
      buyerGstin,
      vendorCompany: order.vendorOrganization.companyName,
      vendorGstin,
      billingLines,
      lines,
      subtotalInr: order.subtotalInr.toFixed(2),
      taxInr: order.taxInr.toFixed(2),
      shippingInr: order.shippingInr.toFixed(2),
      totalInr: order.totalInr.toFixed(2),
      paymentStatus: order.paymentStatus,
      gatewayPaymentId: tx?.gatewayPaymentId ?? null,
      paymentMethodLabel,
    });
  }

  async subscriptionReceiptHtml(partnerUserId: string): Promise<string> {
    const platformGstinRaw = process.env.GARUD_PLATFORM_GSTIN?.trim();
    if (!platformGstinRaw || !GSTIN_RE.test(platformGstinRaw.toUpperCase())) {
      throw new UnprocessableEntityException(
        'GST receipt is not configured (set GARUD_PLATFORM_GSTIN to a valid 15-character GSTIN).',
      );
    }
    const supplierGstin = platformGstinRaw.toUpperCase();
    const sacRaw = (
      process.env.PARTNER_SUBSCRIPTION_SAC_CODE ?? '998431'
    ).trim();
    if (!/^[0-9]{4}([0-9]{2})?([0-9]{2})?$/.test(sacRaw)) {
      throw new UnprocessableEntityException(
        'Invalid PARTNER_SUBSCRIPTION_SAC_CODE for GST receipt.',
      );
    }

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

    const partnerGstin = assertValidGstin('Partner GSTIN', org.gst);

    const ratePct = Number(
      process.env.PARTNER_SUBSCRIPTION_GST_PERCENT ?? '18',
    );
    if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 28) {
      throw new UnprocessableEntityException(
        'Invalid PARTNER_SUBSCRIPTION_GST_PERCENT (use 0–28).',
      );
    }

    const priceInr = new Prisma.Decimal(sub.plan.priceInr);
    const hundred = new Prisma.Decimal(100);
    const rateDec = new Prisma.Decimal(ratePct);
    let taxableValueInr: Prisma.Decimal;
    let cgstInr: Prisma.Decimal;
    let sgstInr: Prisma.Decimal;
    let igstInr: Prisma.Decimal;

    if (ratePct === 0) {
      taxableValueInr = priceInr;
      cgstInr = new Prisma.Decimal(0);
      sgstInr = new Prisma.Decimal(0);
      igstInr = new Prisma.Decimal(0);
    } else {
      const divisor = hundred.add(rateDec);
      taxableValueInr = priceInr.mul(hundred).div(divisor);
      const taxTotal = new Prisma.Decimal(priceInr.sub(taxableValueInr).toFixed(2));
      const platformState = (
        process.env.GARUD_PLATFORM_GST_STATE_CODE ?? '27'
      ).trim();
      const partnerState = partnerGstin.slice(0, 2);
      const intra =
        platformState.length === 2 && partnerState === platformState;
      if (intra) {
        const half = new Prisma.Decimal(taxTotal.div(2).toFixed(2));
        cgstInr = half;
        sgstInr = new Prisma.Decimal(taxTotal.sub(half).toFixed(2));
        igstInr = new Prisma.Decimal(0);
      } else {
        cgstInr = new Prisma.Decimal(0);
        sgstInr = new Prisma.Decimal(0);
        igstInr = taxTotal;
      }
    }

    return renderSubscriptionReceiptHtml({
      receiptNo: sub.id.slice(0, 8).toUpperCase(),
      issuedAt: new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      }),
      supplierGstin,
      partnerCompany: org.companyName,
      partnerGstin,
      planName: sub.plan.name,
      billingPeriod: sub.plan.billingPeriod,
      amountInr: priceInr.toFixed(2),
      taxableValueInr: taxableValueInr.toFixed(2),
      gstRatePercent: ratePct.toFixed(2),
      sacCode: sacRaw,
      cgstInr: cgstInr.toFixed(2),
      sgstInr: sgstInr.toFixed(2),
      igstInr: igstInr.toFixed(2),
      periodStart: sub.currentPeriodStart?.toLocaleDateString('en-IN') ?? null,
      periodEnd: sub.currentPeriodEnd?.toLocaleDateString('en-IN') ?? null,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
    });
  }
}
