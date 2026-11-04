import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PartnerPlan, PartnerSubscriptionStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  isProductionDeploy,
  RazorpayCredentials,
  razorpayRequest,
  readRazorpayCredentials,
  verifySubscriptionPaymentSignature,
} from '../../shared/razorpay/razorpay.util';
import {
  AssignPlanDto,
  CreatePlanDto,
  UpdatePlanDto,
  VerifySubscriptionDto,
} from './dto/billing.dto';
import {
  DEFAULT_PLANS,
  describeEntitlements,
  monthlyEquivalentInr,
  planKeyFromName,
  subscriptionGrantsPlan,
} from './plan-catalog';

export type BillingMode = 'LIVE' | 'SANDBOX' | 'UNAVAILABLE';

export type SubscriptionWebhookEntity = {
  id: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
};

const SUBSCRIPTION_EVENTS = [
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
] as const;

export function isSubscriptionEvent(event: string): boolean {
  return (SUBSCRIPTION_EVENTS as readonly string[]).includes(event);
}

function unixToDate(v?: number | null): Date | null {
  return v ? new Date(v * 1000) : null;
}

/** Plan catalog, partner subscriptions (Razorpay Subscriptions + sandbox), entitlement resolution. */
@Injectable()
export class PartnerBillingService {
  private readonly logger = new Logger(PartnerBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------------ gateway

  private creds(): RazorpayCredentials | null {
    return readRazorpayCredentials(
      (k) => this.config.get<string>(k) ?? process.env[k],
    );
  }

  /** LIVE = Razorpay keys set; SANDBOX = simulated (non-production only); UNAVAILABLE = prod without keys. */
  billingMode(): BillingMode {
    if (this.creds()) return 'LIVE';
    return isProductionDeploy() ? 'UNAVAILABLE' : 'SANDBOX';
  }

  // ------------------------------------------------------------------ plans

  /** Create the seed catalog on first use (idempotent upsert by key). */
  async ensureDefaultPlans(): Promise<void> {
    const count = await this.prisma.partnerPlan.count();
    if (count > 0) return;
    for (const p of DEFAULT_PLANS) {
      await this.prisma.partnerPlan.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.description,
          priceInr: new Prisma.Decimal(p.priceInr),
          billingPeriod: p.billingPeriod,
          listingLimit: p.listingLimit,
          featuredPlacement: p.featuredPlacement,
          rfqPriority: p.rfqPriority,
          isDefault: p.isDefault,
          sortOrder: p.sortOrder,
          features: [...p.features],
        },
      });
    }
  }

  private async getDefaultPlan(): Promise<PartnerPlan> {
    await this.ensureDefaultPlans();
    const plan =
      (await this.prisma.partnerPlan.findFirst({
        where: { isDefault: true },
        orderBy: { sortOrder: 'asc' },
      })) ??
      (await this.prisma.partnerPlan.findFirst({
        where: { priceInr: 0 },
        orderBy: { sortOrder: 'asc' },
      }));
    if (!plan) {
      throw new ServiceUnavailableException(
        'No default partner plan is configured',
      );
    }
    return plan;
  }

  private serializePlan(plan: PartnerPlan) {
    return {
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description,
      priceInr: Number(plan.priceInr),
      billingPeriod: plan.billingPeriod,
      listingLimit: plan.listingLimit,
      featuredPlacement: plan.featuredPlacement,
      rfqPriority: plan.rfqPriority,
      features: plan.features,
      entitlements: describeEntitlements(plan),
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      razorpaySynced: Boolean(plan.razorpayPlanId),
    };
  }

  // ------------------------------------------------------------------ partner side

  private async requireOrg(userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true, companyName: true },
    });
    if (!org) throw new NotFoundException('Partner organization not found');
    return org;
  }

  /** Batch entitlement flags for marketplace / RFQ ranking (NEXT-P3). */
  async getEntitlementsForOrganizations(organizationIds: string[]) {
    const unique = [...new Set(organizationIds.filter(Boolean))];
    const map = new Map<
      string,
      { featuredPlacement: boolean; rfqPriority: boolean }
    >();
    if (!unique.length) return map;

    const defaultPlan = await this.getDefaultPlan();
    const subs = await this.prisma.partnerSubscription.findMany({
      where: { organizationId: { in: unique } },
      include: { plan: true },
    });
    for (const orgId of unique) {
      const sub = subs.find((s) => s.organizationId === orgId);
      const plan =
        sub && subscriptionGrantsPlan(sub) ? sub.plan : defaultPlan;
      map.set(orgId, {
        featuredPlacement: plan.featuredPlacement,
        rfqPriority: plan.rfqPriority,
      });
    }
    return map;
  }

  /** The plan a partner organization is entitled to right now. */
  async resolveEffectivePlan(organizationId: string) {
    const sub = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (sub && subscriptionGrantsPlan(sub)) {
      return {
        plan: sub.plan,
        subscription: sub,
        source: 'SUBSCRIPTION' as const,
      };
    }
    return {
      plan: await this.getDefaultPlan(),
      subscription: sub,
      source: 'DEFAULT' as const,
    };
  }

  async getSubscription(userId: string) {
    const org = await this.requireOrg(userId);
    const [{ plan, subscription, source }, plans, listingCount] =
      await Promise.all([
        this.resolveEffectivePlan(org.id),
        this.listPublicPlans(),
        this.prisma.partnerListing.count({ where: { organizationId: org.id } }),
      ]);

    const mode = this.billingMode();
    const pending =
      subscription?.status === PartnerSubscriptionStatus.PENDING_PAYMENT
        ? subscription
        : null;
    const cancelsAtPeriodEnd = Boolean(
      source === 'SUBSCRIPTION' && subscription?.cancelledAt,
    );

    return {
      billingMode: mode,
      billingEnabled: mode === 'LIVE',
      plan: {
        ...this.serializePlan(plan),
        status:
          source === 'SUBSCRIPTION' && subscription
            ? subscription.status
            : PartnerSubscriptionStatus.ACTIVE,
        source,
        renewsAt:
          source === 'SUBSCRIPTION' && !cancelsAtPeriodEnd
            ? (subscription?.currentPeriodEnd?.toISOString() ?? null)
            : null,
        endsAt: cancelsAtPeriodEnd
          ? (subscription?.currentPeriodEnd?.toISOString() ?? null)
          : null,
      },
      entitlements: describeEntitlements(plan),
      limits: {
        listingLimit: plan.listingLimit,
        featuredPlacement: plan.featuredPlacement,
        rfqPriority: plan.rfqPriority,
      },
      usage: { listings: listingCount, listingLimit: plan.listingLimit },
      pendingCheckout: pending
        ? { planKey: plans.find((p) => p.id === pending.planId)?.key ?? null }
        : null,
      plans: plans.map((p) => ({
        ...p,
        isCurrent: p.key === plan.key,
        requiresPayment: p.priceInr > 0,
      })),
    };
  }

  async listPublicPlans() {
    await this.ensureDefaultPlans();
    const rows = await this.prisma.partnerPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceInr: 'asc' }],
    });
    return rows.map((p) => this.serializePlan(p));
  }

  /**
   * Start a plan change. Free plans switch immediately; paid plans create a Razorpay
   * subscription (or a sandbox one outside production) that the partner must authorise.
   */
  async checkout(userId: string, planKey: string) {
    const org = await this.requireOrg(userId);
    await this.ensureDefaultPlans();
    const plan = await this.prisma.partnerPlan.findUnique({
      where: { key: planKey },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    const existing = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    const holdsPaidAccess =
      existing &&
      subscriptionGrantsPlan(existing) &&
      Number(existing.plan.priceInr) > 0;
    if (holdsPaidAccess && !existing.cancelledAt) {
      if (existing.planId === plan.id) {
        throw new ConflictException('You are already on this plan');
      }
      throw new ConflictException(
        'Cancel your current paid subscription before switching plans.',
      );
    }

    const price = Number(plan.priceInr);
    if (price === 0) {
      await this.prisma.partnerSubscription.upsert({
        where: { organizationId: org.id },
        update: {
          planId: plan.id,
          status: PartnerSubscriptionStatus.ACTIVE,
          razorpaySubscriptionId: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          cancelledAt: null,
        },
        create: {
          organizationId: org.id,
          planId: plan.id,
          status: PartnerSubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
        },
      });
      return { mode: 'ACTIVATED' as const, planKey: plan.key };
    }

    const mode = this.billingMode();
    if (mode === 'UNAVAILABLE') {
      throw new ServiceUnavailableException(
        'Online billing is not enabled yet. Contact GarudHub support to upgrade.',
      );
    }

    let gatewaySubscriptionId: string;
    let shortUrl: string | null = null;
    const creds = this.creds();

    if (mode === 'LIVE' && creds) {
      if (!plan.razorpayPlanId) {
        throw new ServiceUnavailableException(
          'This plan is not available for online checkout yet. Contact GarudHub support.',
        );
      }
      try {
        const sub = await razorpayRequest<{ id: string; short_url?: string }>(
          creds,
          'POST',
          '/subscriptions',
          {
            plan_id: plan.razorpayPlanId,
            total_count: plan.billingPeriod === 'YEARLY' ? 10 : 120,
            customer_notify: 1,
            notes: { garudOrganizationId: org.id, planKey: plan.key },
          },
        );
        gatewaySubscriptionId = sub.id;
        shortUrl = sub.short_url ?? null;
      } catch (err) {
        this.logger.error(
          `Razorpay subscription create failed: ${(err as Error).message}`,
        );
        throw new BadGatewayException(
          'Could not start checkout with the payment gateway. Try again shortly.',
        );
      }
    } else {
      gatewaySubscriptionId = `sub_sand_${crypto.randomBytes(8).toString('hex')}`;
    }

    await this.prisma.partnerSubscription.upsert({
      where: { organizationId: org.id },
      update: {
        planId: plan.id,
        status: PartnerSubscriptionStatus.PENDING_PAYMENT,
        razorpaySubscriptionId: gatewaySubscriptionId,
        cancelledAt: null,
        currentPeriodEnd: null,
      },
      create: {
        organizationId: org.id,
        planId: plan.id,
        status: PartnerSubscriptionStatus.PENDING_PAYMENT,
        razorpaySubscriptionId: gatewaySubscriptionId,
      },
    });

    return {
      mode: 'CHECKOUT' as const,
      planKey: plan.key,
      gateway: 'RAZORPAY' as const,
      subscriptionId: gatewaySubscriptionId,
      keyId: creds?.keyId ?? 'rzp_test_garudhub_sandbox',
      shortUrl,
      sandboxMode: mode === 'SANDBOX',
      amountInr: price,
      companyName: org.companyName,
    };
  }

  /** Confirm the checkout handshake. The webhook remains the source of truth for renewals. */
  async verifyCheckout(userId: string, dto: VerifySubscriptionDto) {
    const org = await this.requireOrg(userId);
    const sub = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId: org.id },
    });
    if (!sub || sub.razorpaySubscriptionId !== dto.razorpaySubscriptionId) {
      throw new NotFoundException(
        'No pending subscription matches this payment',
      );
    }

    const isSandbox = dto.razorpaySubscriptionId.startsWith('sub_sand_');
    const creds = this.creds();
    if (isSandbox) {
      if (isProductionDeploy() || creds) {
        // Sandbox ids must never activate anything where real money is involved.
        throw new BadRequestException('Sandbox payments are not accepted here');
      }
    } else {
      if (!creds) {
        throw new ServiceUnavailableException('Billing is not configured');
      }
      if (
        !verifySubscriptionPaymentSignature(
          dto.razorpayPaymentId,
          dto.razorpaySubscriptionId,
          dto.razorpaySignature,
          creds.keySecret,
        )
      ) {
        throw new BadRequestException('Payment signature verification failed');
      }
    }

    const now = new Date();
    await this.prisma.partnerSubscription.update({
      where: { id: sub.id },
      data: {
        status: PartnerSubscriptionStatus.ACTIVE,
        currentPeriodStart: sub.currentPeriodStart ?? now,
        currentPeriodEnd:
          sub.currentPeriodEnd ?? new Date(now.getTime() + 30 * 86_400_000), // refined by webhook
        cancelledAt: null,
      },
    });
    return this.getSubscription(userId);
  }

  /** Cancel at the end of the paid period (access continues until then). */
  async cancel(userId: string) {
    const org = await this.requireOrg(userId);
    const sub = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId: org.id },
      include: { plan: true },
    });
    if (!sub || !subscriptionGrantsPlan(sub)) {
      throw new BadRequestException(
        'You have no active subscription to cancel',
      );
    }
    if (sub.cancelledAt) {
      throw new ConflictException(
        'Subscription is already scheduled to cancel',
      );
    }

    const creds = this.creds();
    const gatewayId = sub.razorpaySubscriptionId;
    if (gatewayId && !gatewayId.startsWith('sub_sand_') && creds) {
      try {
        await razorpayRequest(
          creds,
          'POST',
          `/subscriptions/${gatewayId}/cancel`,
          {
            cancel_at_cycle_end: 1,
          },
        );
      } catch (err) {
        this.logger.error(`Razorpay cancel failed: ${(err as Error).message}`);
        throw new BadGatewayException(
          'Could not cancel with the payment gateway. Try again shortly.',
        );
      }
    }

    if (Number(sub.plan.priceInr) === 0) {
      // Free non-default plan: drop straight back to the default plan.
      await this.prisma.partnerSubscription.delete({ where: { id: sub.id } });
    } else {
      await this.prisma.partnerSubscription.update({
        where: { id: sub.id },
        data: {
          cancelledAt: new Date(),
          // Without a known period end, access stops now rather than never.
          currentPeriodEnd: sub.currentPeriodEnd ?? new Date(),
        },
      });
    }
    return this.getSubscription(userId);
  }

  /** Block listing creation beyond the plan's limit. */
  async assertCanCreateListing(userId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!org) return; // catalog service reports the missing org
    const { plan } = await this.resolveEffectivePlan(org.id);
    if (plan.listingLimit == null) return;
    const used = await this.prisma.partnerListing.count({
      where: { organizationId: org.id },
    });
    if (used >= plan.listingLimit) {
      throw new ForbiddenException(
        `Your ${plan.name} plan allows ${plan.listingLimit} listings. Upgrade your plan at /partner/subscription to add more.`,
      );
    }
  }

  // ------------------------------------------------------------------ webhook

  /** Apply a Razorpay `subscription.*` event. Unknown subscriptions are ignored (idempotent). */
  async handleSubscriptionEvent(
    event: string,
    entity: SubscriptionWebhookEntity,
  ): Promise<{ handled: boolean }> {
    const sub = await this.prisma.partnerSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) {
      this.logger.warn(
        `Webhook ${event} for unknown subscription ${entity.id}`,
      );
      return { handled: false };
    }

    const periodStart = unixToDate(entity.current_start);
    const periodEnd = unixToDate(entity.current_end);

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged':
        await this.prisma.partnerSubscription.update({
          where: { id: sub.id },
          data: {
            status: PartnerSubscriptionStatus.ACTIVE,
            ...(periodStart ? { currentPeriodStart: periodStart } : {}),
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        });
        break;
      case 'subscription.pending':
      case 'subscription.halted':
        await this.prisma.partnerSubscription.update({
          where: { id: sub.id },
          data: { status: PartnerSubscriptionStatus.PAST_DUE },
        });
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
        await this.prisma.partnerSubscription.update({
          where: { id: sub.id },
          data: {
            status: PartnerSubscriptionStatus.CANCELLED,
            cancelledAt: sub.cancelledAt ?? new Date(),
          },
        });
        break;
      default:
        return { handled: false };
    }
    return { handled: true };
  }

  // ------------------------------------------------------------------ admin

  async adminListPlans() {
    await this.ensureDefaultPlans();
    const [plans, grouped] = await Promise.all([
      this.prisma.partnerPlan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { priceInr: 'asc' }],
      }),
      this.prisma.partnerSubscription.groupBy({
        by: ['planId', 'status'],
        _count: { _all: true },
      }),
    ]);

    let mrr = 0;
    const items = plans.map((p) => {
      const counts = grouped.filter((g) => g.planId === p.id);
      const active = counts
        .filter((c) => c.status === PartnerSubscriptionStatus.ACTIVE)
        .reduce((n, c) => n + c._count._all, 0);
      const total = counts.reduce((n, c) => n + c._count._all, 0);
      mrr += active * monthlyEquivalentInr(Number(p.priceInr), p.billingPeriod);
      return { ...this.serializePlan(p), subscribers: { active, total } };
    });

    return {
      billingMode: this.billingMode(),
      mrrInr: Math.round(mrr),
      plans: items,
    };
  }

  async adminListSubscriptions(status?: PartnerSubscriptionStatus) {
    const rows = await this.prisma.partnerSubscription.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        plan: { select: { key: true, name: true, priceInr: true } },
        organization: { select: { id: true, companyName: true } },
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        plan: {
          key: r.plan.key,
          name: r.plan.name,
          priceInr: Number(r.plan.priceInr),
        },
        organization: r.organization,
        razorpaySubscriptionId: r.razorpaySubscriptionId,
        currentPeriodEnd: r.currentPeriodEnd?.toISOString() ?? null,
        cancelledAt: r.cancelledAt?.toISOString() ?? null,
        assignedByAdmin: Boolean(r.assignedByAdminId),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async adminCreatePlan(dto: CreatePlanDto) {
    const key = dto.key ?? planKeyFromName(dto.name);
    if (!/^[A-Z0-9_]{2,40}$/.test(key)) {
      throw new BadRequestException(
        'Could not derive a valid plan key from the name',
      );
    }
    if (await this.prisma.partnerPlan.findUnique({ where: { key } })) {
      throw new ConflictException(`Plan key ${key} already exists`);
    }
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        this.assertFreeDefault(dto.priceInr);
        await tx.partnerPlan.updateMany({ data: { isDefault: false } });
      }
      return tx.partnerPlan.create({
        data: {
          key,
          name: dto.name.trim(),
          description: dto.description.trim(),
          priceInr: new Prisma.Decimal(dto.priceInr),
          billingPeriod: dto.billingPeriod,
          listingLimit: dto.listingLimit ?? null,
          featuredPlacement: dto.featuredPlacement ?? false,
          rfqPriority: dto.rfqPriority ?? false,
          features: dto.features?.map((f) => f.trim()).filter(Boolean) ?? [],
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
          sortOrder: dto.sortOrder ?? 100,
        },
      });
    });
    return this.serializePlan(created);
  }

  async adminUpdatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.partnerPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const nextPrice = dto.priceInr ?? Number(plan.priceInr);
    if (dto.isDefault) this.assertFreeDefault(nextPrice);
    if (plan.isDefault && dto.isActive === false) {
      throw new BadRequestException('The default plan cannot be deactivated');
    }
    if (plan.isDefault && dto.isDefault === false) {
      throw new BadRequestException(
        'Make another plan the default instead of unsetting this one',
      );
    }
    if (plan.isDefault && nextPrice > 0) {
      throw new BadRequestException('The default plan must be free');
    }

    // Razorpay plans are immutable: a price/period change requires a new sync.
    const repriced =
      (dto.priceInr != null && dto.priceInr !== Number(plan.priceInr)) ||
      (dto.billingPeriod != null && dto.billingPeriod !== plan.billingPeriod);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.partnerPlan.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.partnerPlan.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          priceInr:
            dto.priceInr != null ? new Prisma.Decimal(dto.priceInr) : undefined,
          billingPeriod: dto.billingPeriod,
          listingLimit: dto.listingLimit,
          featuredPlacement: dto.featuredPlacement,
          rfqPriority: dto.rfqPriority,
          features: dto.features?.map((f) => f.trim()).filter(Boolean),
          isActive: dto.isActive,
          isDefault: dto.isDefault,
          sortOrder: dto.sortOrder,
          ...(repriced ? { razorpayPlanId: null } : {}),
        },
      });
    });
    return this.serializePlan(updated);
  }

  private assertFreeDefault(priceInr: number) {
    if (priceInr > 0) {
      throw new BadRequestException('The default plan must be free');
    }
  }

  /** Create the matching Razorpay plan so partners can check out. */
  async adminSyncRazorpayPlan(id: string) {
    const plan = await this.prisma.partnerPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (Number(plan.priceInr) <= 0) {
      throw new BadRequestException('Free plans do not need a Razorpay plan');
    }
    if (plan.razorpayPlanId) {
      return {
        synced: true,
        razorpayPlanId: plan.razorpayPlanId,
        created: false,
      };
    }
    const creds = this.creds();
    if (!creds) {
      throw new ServiceUnavailableException(
        'Razorpay keys are not configured on this environment',
      );
    }
    try {
      const rp = await razorpayRequest<{ id: string }>(
        creds,
        'POST',
        '/plans',
        {
          period: plan.billingPeriod === 'YEARLY' ? 'yearly' : 'monthly',
          interval: 1,
          item: {
            name: `GarudHub ${plan.name}`,
            description: plan.description.slice(0, 250),
            amount: Math.round(Number(plan.priceInr) * 100),
            currency: 'INR',
          },
          notes: { garudPlanKey: plan.key },
        },
      );
      await this.prisma.partnerPlan.update({
        where: { id },
        data: { razorpayPlanId: rp.id },
      });
      return { synced: true, razorpayPlanId: rp.id, created: true };
    } catch (err) {
      this.logger.error(`Razorpay plan sync failed: ${(err as Error).message}`);
      throw new BadGatewayException(
        'Razorpay rejected the plan. Check server logs.',
      );
    }
  }

  /** Admin comp / offline-invoice assignment; bypasses the gateway. */
  async adminAssignPlan(adminUserId: string, dto: AssignPlanDto) {
    const [org, plan] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true, companyName: true },
      }),
      this.prisma.partnerPlan.findUnique({ where: { key: dto.planKey } }),
    ]);
    if (!org) throw new NotFoundException('Organization not found');
    if (!plan) throw new NotFoundException('Plan not found');

    const existing = await this.prisma.partnerSubscription.findUnique({
      where: { organizationId: org.id },
    });
    if (
      existing?.razorpaySubscriptionId &&
      !existing.razorpaySubscriptionId.startsWith('sub_sand_') &&
      subscriptionGrantsPlan(existing) &&
      !existing.cancelledAt
    ) {
      throw new ConflictException(
        'Partner has a live gateway subscription; it must be cancelled first.',
      );
    }

    const data = {
      planId: plan.id,
      status: PartnerSubscriptionStatus.ACTIVE,
      razorpaySubscriptionId: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelledAt: null,
      assignedByAdminId: adminUserId,
    };
    await this.prisma.partnerSubscription.upsert({
      where: { organizationId: org.id },
      update: data,
      create: { organizationId: org.id, ...data },
    });
    return { organization: org, planKey: plan.key };
  }
}
