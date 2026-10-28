import {
  AccountType,
  CatalogCategory,
  FulfillmentStatus,
  ListingReviewStatus,
  ListingType,
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  TransactionStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Dev-only credentials — see DEMO_ACCOUNTS.md at repo root */
const DEMO_PASSWORD =
  process.env.DEMO_PASSWORD ?? 'ChangeMeDemo123!';

type DemoAccount = {
  email: string;
  password?: string;
  role: UserRole;
  accountType: AccountType;
  companyName: string;
  verificationStatus: VerificationStatus;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: process.env.ADMIN_EMAIL ?? 'admin@garudhub.local',
    password: process.env.ADMIN_PASSWORD ?? DEMO_PASSWORD,
    role: UserRole.PLATFORM_ADMIN,
    accountType: AccountType.TECHNOLOGY_COMPANY,
    companyName: 'GarudHub Platform',
    verificationStatus: VerificationStatus.APPROVED,
  },
  {
    email: 'partner@garudhub.local',
    role: UserRole.PARTNER,
    accountType: AccountType.MANUFACTURER,
    companyName: 'Demo Drone Manufacturing Pvt Ltd',
    verificationStatus: VerificationStatus.APPROVED,
  },
  {
    email: 'buyer@garudhub.local',
    role: UserRole.BUYER,
    accountType: AccountType.BUYER_ENTERPRISE,
    companyName: 'Demo Buyer Enterprise',
    verificationStatus: VerificationStatus.APPROVED,
  },
  {
    email: 'checkout-test@garudhub.local',
    role: UserRole.BUYER,
    accountType: AccountType.BUYER_ENTERPRISE,
    companyName: 'Checkout Test Buyer',
    verificationStatus: VerificationStatus.APPROVED,
  },
  {
    email: 'government@garudhub.local',
    role: UserRole.GOVERNMENT,
    accountType: AccountType.GOVERNMENT_PSU,
    companyName: 'Demo Government PSU',
    verificationStatus: VerificationStatus.APPROVED,
  },
];

async function upsertDemoUser(account: DemoAccount) {
  const email = account.email.toLowerCase();
  const password = account.password ?? DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const orgFields = {
    companyName: account.companyName,
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    contactPersonName: `${account.role} Demo User`,
    contactEmail: email,
    contactMobile: '9000000000',
    verificationStatus: account.verificationStatus,
    ...(account.verificationStatus === VerificationStatus.APPROVED
      ? { submittedAt: now, reviewedAt: now }
      : {}),
  };

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: account.role,
      accountType: account.accountType,
      organization: { create: orgFields },
    },
    update: {
      passwordHash,
      role: account.role,
      accountType: account.accountType,
      organization: {
        upsert: {
          create: orgFields,
          update: orgFields,
        },
      },
    },
  });

  console.log(`Seeded demo user: ${email} (${account.role})`);
}

const DEMO_LISTING_IMAGE =
  'https://i.ibb.co/B5tNxyyB/Chat-GPT-Image-Aug-26-2026-02-37-37-PM-1.webp';

type DemoListingSeed = {
  name: string;
  sku: string;
  listingType: ListingType;
  category: CatalogCategory;
  priceOnRequest: boolean;
  priceInr: number | null;
  minOrderQuantity: number;
  description: string;
  primaryImageUrl: string;
  isPublished?: boolean;
  reviewStatus?: ListingReviewStatus;
};

async function seedDemoCatalogListings() {
  const partner = await prisma.user.findUnique({
    where: { email: 'partner@garudhub.local' },
    include: { organization: true },
  });
  if (!partner?.organization) return;

  const orgId = partner.organization.id;
  const samples: DemoListingSeed[] = [
    {
      name: 'Garud AgriSpray X1',
      sku: 'GD-AGRI-X1',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.AGRICULTURE_DRONE,
      priceOnRequest: false,
      priceInr: 285000,
      minOrderQuantity: 1,
      description:
        '16L agriculture spraying platform with RTK, terrain follow, and DGCA-friendly ops kit for contract spraying teams.',
      primaryImageUrl: DEMO_LISTING_IMAGE,
    },
    {
      name: 'SurveyMapper Pro 40',
      sku: 'GD-SURV-40',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.SURVEY_MAPPING_DRONE,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 2,
      description:
        'Long-endurance mapping UAV with PPK workflow — quote includes base/rover options and training days.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    },
    {
      name: 'Garud Industrial Lift M600',
      sku: 'GD-INDU-M600',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
      priceOnRequest: false,
      priceInr: 1250000,
      minOrderQuantity: 1,
      description:
        'Heavy-lift enterprise hexacopter for logistics yards and inspection payloads up to 5 kg.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1524443164165-7d786564b350?w=800&q=80',
    },
    {
      name: 'Garud CinemaCam M3E',
      sku: 'GD-CAM-M3E',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.CAMERA_DRONE,
      priceOnRequest: false,
      priceInr: 89500,
      minOrderQuantity: 1,
      description:
        'Compact 4K cinema drone with 3-axis gimbal, obstacle sensing, and broadcast-friendly ND filters.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1508610048650-a6472333995a?w=800&q=80',
    },
    {
      name: 'Garud NavCore FC-32 Flight Controller',
      sku: 'GD-COMP-FC32',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.COMPONENT,
      priceOnRequest: false,
      priceInr: 12800,
      minOrderQuantity: 5,
      description:
        'Redundant IMU flight controller module with CAN ESC support for custom multirotor builds.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    },
    {
      name: 'Garud PowerPack 88Wh Battery Kit',
      sku: 'GD-ACC-BATT88',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.ACCESSORY,
      priceOnRequest: false,
      priceInr: 18500,
      minOrderQuantity: 2,
      description:
        'Smart 88Wh Li-ion pack with charge hub cable — compatible with Garud survey and agri airframes.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1609091839311-9a942d692196?w=800&q=80',
    },
    {
      name: 'Garud MultiSpec NDVI Payload',
      sku: 'GD-PAY-MULTI',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.PAYLOAD,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 1,
      description:
        'Multispectral camera payload for crop health indices — pricing depends on lens set and calibration.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
    },
    {
      name: 'SurveyMapper Lite 25',
      sku: 'GD-SURV-25',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.SURVEY_MAPPING_DRONE,
      priceOnRequest: false,
      priceInr: 425000,
      minOrderQuantity: 1,
      description:
        'Mid-range photogrammetry drone with 25 min flight time — fixed list price for quick cart checkout tests.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    },
    {
      name: 'Garud AgriSpray Lite S',
      sku: 'GD-AGRI-LITE',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.AGRICULTURE_DRONE,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 3,
      description:
        'Entry agri sprayer for smallholder cooperatives — MOQ 3 units, RFQ for fleet pricing.',
      primaryImageUrl: DEMO_LISTING_IMAGE,
    },
    {
      name: 'Garud Pilot Academy — DGCA Category Training',
      sku: 'GD-SVC-TRN-01',
      listingType: ListingType.SERVICE,
      category: CatalogCategory.TRAINING,
      priceOnRequest: false,
      priceInr: 45000,
      minOrderQuantity: 1,
      description:
        '5-day remote pilot training including simulator hours and GarudHub certificate of completion.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    },
    {
      name: 'Garud Care Annual Maintenance Contract',
      sku: 'GD-SVC-RM-01',
      listingType: ListingType.SERVICE,
      category: CatalogCategory.REPAIR_MAINTENANCE,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 1,
      description:
        'On-site AMC for enterprise fleets — RFQ includes spare parts tier and SLA response window.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80',
    },
    {
      name: 'Garud Fleet Ops & Compliance Consultancy',
      sku: 'GD-SVC-CON-01',
      listingType: ListingType.SERVICE,
      category: CatalogCategory.CONSULTANCY,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 1,
      description:
        'BVLOS readiness, SOP design, and regulatory filing support for state PSU and enterprise buyers.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    },
    // Partner draft + admin moderation queue (not visible on marketplace until approved)
    {
      name: 'Garud ProtoFrame X (Draft)',
      sku: 'GD-DRAFT-PROT',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.OTHER,
      priceOnRequest: false,
      priceInr: 99000,
      minOrderQuantity: 1,
      description: 'Work-in-progress listing for partner catalog editor and save-draft flows.',
      primaryImageUrl: DEMO_LISTING_IMAGE,
      isPublished: false,
      reviewStatus: ListingReviewStatus.DRAFT,
    },
    {
      name: 'Garud ThermalInspect T2 (Pending Review)',
      sku: 'GD-PEND-REV',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.INDUSTRIAL_ENTERPRISE_DRONE,
      priceOnRequest: false,
      priceInr: 620000,
      minOrderQuantity: 1,
      description:
        'Submitted for platform admin approval — use admin moderation UI to approve or reject.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1524443164165-7d786564b350?w=800&q=80',
      isPublished: false,
      reviewStatus: ListingReviewStatus.PENDING_REVIEW,
    },
  ];

  for (const sample of samples) {
    const isPublished = sample.isPublished ?? true;
    const reviewStatus = sample.reviewStatus ?? ListingReviewStatus.APPROVED;
    const listingData = {
      listingType: sample.listingType,
      category: sample.category,
      name: sample.name,
      sku: sample.sku,
      brand: 'Garud Demo',
      description: sample.description,
      primaryImageUrl: sample.primaryImageUrl,
      galleryImageUrls: [] as string[],
      minOrderQuantity: sample.minOrderQuantity,
      priceOnRequest: sample.priceOnRequest,
      priceInr: sample.priceInr,
      isPublished,
      reviewStatus,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
    };

    const existing = await prisma.partnerListing.findFirst({
      where: { organizationId: orgId, sku: sample.sku },
    });
    if (existing) {
      await prisma.partnerListing.update({
        where: { id: existing.id },
        data: listingData,
      });
      console.log(`Updated demo listing: ${sample.sku}`);
      continue;
    }

    await prisma.partnerListing.create({
      data: {
        organizationId: orgId,
        ...listingData,
      },
    });
    console.log(`Seeded demo listing: ${sample.sku}`);
  }
}

async function seedDemoOrders() {
  const existingCount = await prisma.order.count();
  if (existingCount > 0) {
    const existingOrders = await prisma.order.findMany();
    for (const [idx, ord] of existingOrders.entries()) {
      const txCount = await prisma.paymentTransaction.count({ where: { orderId: ord.id } });
      if (txCount === 0) {
        await prisma.paymentTransaction.create({
          data: {
            orderId: ord.id,
            gateway: PaymentGateway.BANK_TRANSFER_NEFT_RTGS,
            utrNumber: `HDFC26101298${String(idx + 1).padStart(4, '0')}`,
            senderBankName: 'HDFC Bank Ltd',
            amountInr: ord.totalInr,
            status: ord.paymentStatus === PaymentStatus.PAID ? TransactionStatus.SUCCESS : TransactionStatus.PROCESSING,
            paymentMethod: 'neft_rtgs_wire',
            metadata: {
              reconciledBy: 'admin@garudhub.local',
              settlementDate: new Date().toISOString(),
            },
          },
        });
      }
    }
    console.log(`Orders already exist (${existingCount}), ensured payment transactions are present.`);
    return;
  }

  const buyer = await prisma.user.findUnique({
    where: { email: 'buyer@garudhub.local' },
    include: { organization: true },
  });
  const partner = await prisma.user.findUnique({
    where: { email: 'partner@garudhub.local' },
    include: { organization: true },
  });

  if (!buyer || !partner || !buyer.organization || !partner.organization) {
    console.log('Buyer or partner not found for seeding orders, skipping.');
    return;
  }

  const listing = await prisma.partnerListing.findFirst({
    where: { organizationId: partner.organization.id },
  });

  if (!listing) {
    console.log('No listing found to create order line items, skipping.');
    return;
  }

  const unitPrice = listing.priceInr ? Number(listing.priceInr) : 450000;
  const quantity = 1;
  const subtotal = unitPrice * quantity;
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  await prisma.order.create({
    data: {
      buyerUserId: buyer.id,
      buyerOrganizationId: buyer.organization.id,
      vendorOrganizationId: partner.organization.id,
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
      subtotalInr: subtotal,
      taxInr: tax,
      shippingInr: 0,
      totalInr: total,
      companyName: buyer.organization.companyName,
      contactName: 'Rohit Sharma',
      contactPhone: '+91 98765 43210',
      shippingAddressLine1: 'Plot 42, Aero Space Tech Zone',
      shippingCity: 'Bengaluru',
      shippingState: 'Karnataka',
      shippingPincode: '560100',
      shippingCountry: 'India',
      billingAddressLine1: 'Plot 42, Aero Space Tech Zone',
      billingCity: 'Bengaluru',
      billingState: 'Karnataka',
      billingPincode: '560100',
      billingCountry: 'India',
      gstin: '29ABCDE1234F1Z5',
      purchaseOrderNumber: 'PO-2026-IND-001',
      lineItems: {
        create: [
          {
            listingId: listing.id,
            snapshotName: listing.name,
            snapshotSku: listing.sku || 'GD-SKU-DEMO',
            unitPriceInr: unitPrice,
            quantity: 1,
            lineTotalInr: subtotal,
          },
        ],
      },
      transactions: {
        create: [
          {
            gateway: PaymentGateway.BANK_TRANSFER_NEFT_RTGS,
            utrNumber: 'HDFC261012984102',
            senderBankName: 'HDFC Bank Ltd',
            amountInr: total,
            status: TransactionStatus.SUCCESS,
            paymentMethod: 'neft_rtgs_wire',
            metadata: {
              reconciledBy: 'admin@garudhub.local',
              settlementDate: new Date().toISOString(),
            },
          },
        ],
      },
    },
  });

  console.log('Seeded demo confirmed order: PO-2026-IND-001 with verified NEFT transaction');
}

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    await upsertDemoUser(account);
  }
  await seedDemoCatalogListings();
  await seedDemoOrders();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
