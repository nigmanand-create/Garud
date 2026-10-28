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
  technicalSpecs: string;
  applications: string[];
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
        'Fixed-price agriculture spray drone for pesticide and crop protection in Punjab-style contract spraying. 16L tank, RTK terrain follow, and DGCA type-cert friendly documentation kit. Ideal for teams needing a sub-₹3 lakh platform with published list price for cart checkout.',
      technicalSpecs:
        'Tank capacity: 16 L | Max payload (spray + battery): 18 kg | Endurance: 22 min (full tank) | RTK GPS + terrain follow | Spray width: 4–6 m | DGCA model reference: GD-AGRI-X1',
      applications: ['Agriculture Spraying'],
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
        'Enterprise survey and mapping UAV for construction site photogrammetry, PPK/RTK workflows, and lidar-ready mounts. Price on request — RFQ includes base/rover kit options, calibration, and on-site training days. MOQ 2 for fleet deployments.',
      technicalSpecs:
        'Endurance: 40 min (mapping payload) | PPK/RTK ready (base + rover quoted separately) | Max payload: 2.5 kg | Camera: 42 MP RGB (optional multispectral mount) | Wind tolerance: 12 m/s | Survey grade: cm-level with PPK post-processing',
      applications: [
        'Topographic Survey & Mapping',
        'Mining & Volumetric Estimation',
        'Industrial & Infrastructure Inspection',
      ],
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
        'Heavy-lift industrial hexacopter for yard logistics, thermal inspection, and enterprise payloads up to 5 kg. Fixed list price ~₹12.5 lakh — suited to PSU and factory buyers comparing endurance and payload against survey or agri platforms.',
      technicalSpecs:
        'Max payload: 5 kg | Endurance: 28 min @ 3 kg payload | Propulsion: hexacopter, redundant ESC | Thermal gimbal mount (optional) | DGCA enterprise ops documentation available on request',
      applications: [
        'Industrial & Infrastructure Inspection',
        'Delivery & Logistics Payload',
        'Powerline & Solar Panel Monitoring',
      ],
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
        'Compact 4K cinema and photo drone with 3-axis gimbal, obstacle sensing, and ND filters for Indian film, wedding, and broadcast crews. Fixed MRP under ₹1 lakh on GarudHub — DGCA remote pilot rules apply; not a survey, agri spray, or enterprise inspection platform.',
      technicalSpecs:
        'Video: 4K/60, 10-bit D-Log | Gimbal: 3-axis mechanical | Endurance: 34 min | Obstacle sensing: omnidirectional | Max speed: 21 m/s | Max payload: ~250 g (camera only)',
      applications: [],
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
        'Redundant IMU flight controller for custom multirotor builds — CAN ESC, RTK survey rigs, and agri spray integrator BOMs. MOQ 5; list price ₹12,800 per unit for Karnataka/OEM batch orders. Pair with marketplace airframes or DGCA type-cert documentation via RFQ.',
      technicalSpecs:
        'Dual IMU redundancy | CAN bus ESC support | Inputs: GPS, RTK UART, telemetry | Firmware: ArduPilot-compatible | Operating temp: -10°C to 50°C | Weight: 38 g | Typical use: 2–5 kg custom payloads',
      applications: ['Topographic Survey & Mapping', 'Agriculture Spraying'],
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
        'Smart 88Wh Li-ion battery kit with charge hub — extends flight time for Garud SurveyMapper and AgriSpray fleets across India. B2B accessory add-on (MOQ 2); not a standalone drone listing.',
      technicalSpecs:
        'Capacity: 88 Wh | Charge time: 45 min (hub) | Compatible: SurveyMapper Lite 25, AgriSpray X1 | Endurance boost: +8–12 min vs stock pack | Cycle rating: 300+ | Includes: hub cable, fire-safe case',
      applications: ['Agriculture Spraying', 'Topographic Survey & Mapping'],
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
        'Multispectral NDVI payload for crop health, agri spray prescription mapping, and precision farming. Price on request — lens set and radiometric calibration quoted per use case. Mounts on survey or agri platforms.',
      technicalSpecs:
        'Bands: RGB + Red Edge + NIR | NDVI/NDRE indices | Mount: standard Garud payload rail | Weight: 420 g | Trigger: PPK-sync capable | Calibration: factory + field target (RFQ)',
      applications: ['Agriculture Spraying', 'Topographic Survey & Mapping'],
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
        'Mid-range photogrammetry and PPK-ready mapping drone — 25 min endurance, fixed ₹4,25,000 list price for construction survey and cart checkout demos. Lighter alternative to SurveyMapper Pro 40 when budget is under ₹5 lakh.',
      technicalSpecs:
        'Endurance: 25 min | Camera: 20 MP RGB | PPK workflow supported (rover optional) | Max payload: 1.2 kg | Mapping accuracy: 2–5 cm GSD @ 100 m AGL | Wind: 10 m/s',
      applications: ['Topographic Survey & Mapping', 'Mining & Volumetric Estimation'],
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
        'Entry-level agri spray drone for smallholder cooperatives — lighter tank than AgriSpray X1, fleet MOQ 3. Price on request; use RFQ for Punjab/Haryana spraying programs and DGCA compliance paperwork.',
      technicalSpecs:
        'Tank capacity: 10 L | Endurance: 18 min (full tank) | Max payload: 12 kg | RTK optional | Spray width: 3–5 m | DGCA documentation support via RFQ',
      applications: ['Agriculture Spraying'],
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
        'DGCA-aligned remote pilot category training — 5-day Bengaluru cohort with simulator hours, Drone Rules 2021 overview, and GarudHub completion certificate. Fixed ₹45,000 per seat for agri spray, survey, or enterprise buyers onboarding pilots before fleet RFQs.',
      technicalSpecs:
        'Duration: 5 days (40 hrs) | Format: classroom + simulator | Topics: DGCA Drone Rules 2021, NPNT basics, airspace, agri/survey SOP intro | Certificate: GarudHub completion | Batch size: 8–20 | Language: English + Hindi briefing',
      applications: ['Agriculture Spraying', 'Topographic Survey & Mapping'],
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
        'Annual maintenance contract (AMC) for enterprise agri, survey, and industrial fleets — on-site repair, spare parts tier, and SLA response. RFQ for payload calibration and DGCA logbook support.',
      technicalSpecs:
        'Coverage: airframe, propulsion, payload mount | SLA: 48 hr on-site (metro) | Spares: tiered BOM in RFQ | Excludes: crash damage beyond wear items',
      applications: [
        'Industrial & Infrastructure Inspection',
        'Agriculture Spraying',
        'Topographic Survey & Mapping',
      ],
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
        'BVLOS readiness, SOP design, DGCA filing, and compliance consultancy for state PSU and enterprise drone programs — pairs with marketplace hardware RFQs for agri spray or survey fleets.',
      technicalSpecs:
        'Deliverables: SOP pack, risk assessment, DGCA application support | BVLOS: feasibility + test plan | Timeline: 4–12 weeks (RFQ scoped) | On-site workshops available',
      applications: [
        'Industrial & Infrastructure Inspection',
        'Security & Surveillance',
        'Disaster Management & Search & Rescue',
      ],
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
      technicalSpecs: '',
      applications: [],
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
      technicalSpecs:
        'Thermal payload placeholder | Endurance: TBD | Pending moderation — specs not shown on marketplace',
      applications: ['Industrial & Infrastructure Inspection'],
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
      technicalSpecs: sample.technicalSpecs.trim() || null,
      applications: sample.applications,
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
