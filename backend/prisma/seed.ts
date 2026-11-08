import {
  AccountType,
  EnquiryStatus,
  FulfillmentStatus,
  GovOpportunityStatus,
  GovOpportunityType,
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  TransactionStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { seedMarketplaceListingsForPartner } from './seed-marketplace-listings';

const prisma = new PrismaClient();

if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_DEMO_SEED !== 'true'
) {
  console.error(
    'Refusing to run prisma seed in NODE_ENV=production (demo passwords). Set ALLOW_DEMO_SEED=true only on a one-off staging bootstrap.',
  );
  process.exit(1);
}

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
  /** E.164 for OTP login smoke tests (unique per demo row). */
  phoneE164: string;
  contactMobile: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: process.env.ADMIN_EMAIL ?? 'admin@garudhub.local',
    password: process.env.ADMIN_PASSWORD ?? DEMO_PASSWORD,
    role: UserRole.PLATFORM_ADMIN,
    accountType: AccountType.TECHNOLOGY_COMPANY,
    companyName: 'GarudHub Platform',
    verificationStatus: VerificationStatus.APPROVED,
    phoneE164: '+919000000001',
    contactMobile: '9000000001',
  },
  {
    email: 'partner@garudhub.local',
    role: UserRole.PARTNER,
    accountType: AccountType.MANUFACTURER,
    companyName: 'Demo Drone Manufacturing Pvt Ltd',
    verificationStatus: VerificationStatus.APPROVED,
    phoneE164: '+919000000002',
    contactMobile: '9000000002',
  },
  {
    email: 'buyer@garudhub.local',
    role: UserRole.BUYER,
    accountType: AccountType.BUYER_ENTERPRISE,
    companyName: 'Demo Buyer Enterprise',
    verificationStatus: VerificationStatus.APPROVED,
    phoneE164: '+919000000003',
    contactMobile: '9000000003',
  },
  {
    email: 'checkout-test@garudhub.local',
    role: UserRole.BUYER,
    accountType: AccountType.BUYER_ENTERPRISE,
    companyName: 'Checkout Test Buyer',
    verificationStatus: VerificationStatus.APPROVED,
    phoneE164: '+919000000004',
    contactMobile: '9000000004',
  },
  {
    email: 'government@garudhub.local',
    role: UserRole.GOVERNMENT,
    accountType: AccountType.GOVERNMENT_PSU,
    companyName: 'Demo Government PSU',
    verificationStatus: VerificationStatus.APPROVED,
    phoneE164: '+919000000005',
    contactMobile: '9000000005',
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
    contactMobile: account.contactMobile,
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
      phoneE164: account.phoneE164,
      phoneVerifiedAt: now,
      role: account.role,
      accountType: account.accountType,
      organization: { create: orgFields },
    },
    update: {
      passwordHash,
      phoneE164: account.phoneE164,
      phoneVerifiedAt: now,
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

async function seedDemoCatalogListings() {
  await seedMarketplaceListingsForPartner(prisma);
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

const SEED_GOV_REFERENCE_PREFIX = 'GARUD-SEED-GOV';

type SeedGovRow = {
  type: GovOpportunityType;
  title: string;
  summary: string;
  description: string;
  issuingBody: string;
  referenceNo: string;
  state: string | null;
  sourceUrl: string | null;
  estimatedValueInr: number | null;
  openDate: Date | null;
  closingDate: Date | null;
  eligibility: string | null;
};

/** Curated published tenders + schemes so `/government` is non-empty after seed. */
async function seedPublishedGovOpportunities(adminUserId: string) {
  const closeFar = new Date('2099-12-31T18:30:00.000Z');
  const opened = new Date('2025-01-15T00:00:00.000Z');

  const rows: SeedGovRow[] = [
    {
      type: GovOpportunityType.TENDER,
      title: 'UAV-based agricultural survey services (state pilot)',
      summary:
        'Hiring qualified operators for multispectral crop health surveys across three districts. ISO-compliant imagery and reporting.',
      description:
        'Seeded demo tender for local development. Replace with live opportunities in production.\n\nDeliverables: flight plans, raw imagery, orthomosaic, advisory report.',
      issuingBody: 'Department of Agriculture & Farmers Welfare',
      referenceNo: `${SEED_GOV_REFERENCE_PREFIX}-TDR-2026-001`,
      state: 'Karnataka',
      sourceUrl: 'https://example.gov.in/tenders/demo-001',
      estimatedValueInr: 18500000,
      openDate: opened,
      closingDate: closeFar,
      eligibility:
        'DGCA-approved remote pilot organisation; prior work in precision agriculture preferred.',
    },
    {
      type: GovOpportunityType.TENDER,
      title: 'Border surveillance drone maintenance and spares (RFQ)',
      summary:
        'Annual maintenance contract and critical spares for fixed-wing surveillance UAVs operated under central scheme.',
      description:
        'Seeded demo tender. Scope includes depot-level repairs, firmware updates, and stock of motors and ESCs.',
      issuingBody: 'Ministry of Home Affairs (representative)',
      referenceNo: `${SEED_GOV_REFERENCE_PREFIX}-TDR-2026-002`,
      state: null,
      sourceUrl: null,
      estimatedValueInr: 420000000,
      openDate: opened,
      closingDate: closeFar,
      eligibility: 'OEM-authorised service partner or certified MRO with relevant security clearances.',
    },
    {
      type: GovOpportunityType.SCHEME,
      title: 'Drone Shakti — productivity-linked subsidy for farm spraying',
      summary:
        'Central subsidy for purchasing crop protection drone systems for FPOs and large farmers in identified blocks.',
      description:
        'Seeded demo scheme record. Shows scheme eligibility and value on the public listing; no sealed bidding.',
      issuingBody: 'Ministry of Agriculture & Farmers Welfare',
      referenceNo: `${SEED_GOV_REFERENCE_PREFIX}-SCH-2026-001`,
      state: 'Punjab',
      sourceUrl: 'https://example.gov.in/schemes/drone-shakti-demo',
      estimatedValueInr: null,
      openDate: null,
      closingDate: null,
      eligibility: 'Registered FPO or farmer producer group; proof of landholding and training certificate.',
    },
    {
      type: GovOpportunityType.SUBSIDY,
      title: 'State drone operator training reimbursement',
      summary:
        'Reimbursement of DGCA-compliant remote pilot training fees for SC/ST youth in industrial corridors.',
      description:
        'Seeded demo subsidy. Applicants submit training invoices through GarudHub enquiry flow.',
      issuingBody: 'Industries Department (Demo State)',
      referenceNo: `${SEED_GOV_REFERENCE_PREFIX}-SUB-2026-001`,
      state: 'Tamil Nadu',
      sourceUrl: null,
      estimatedValueInr: 75000,
      openDate: null,
      closingDate: closeFar,
      eligibility: 'Resident of target districts; training completed at GarudHub-listed institute.',
    },
  ];

  for (const row of rows) {
    const existing = await prisma.govOpportunity.findFirst({
      where: { referenceNo: row.referenceNo },
    });
    if (existing) continue;

    await prisma.govOpportunity.create({
      data: {
        ...row,
        status: GovOpportunityStatus.PUBLISHED,
        publishedAt: new Date(),
        createdByUserId: adminUserId,
      },
    });
    console.log(`Seeded published gov opportunity: ${row.referenceNo}`);
  }
}

async function seedDemoEnquiry() {
  const existing = await prisma.enquiry.findFirst({
    where: { email: 'demo.enquiry@garudhub.local' },
  });
  if (existing) return;

  await prisma.enquiry.create({
    data: {
      name: 'Demo Lead — Compliance',
      email: 'demo.enquiry@garudhub.local',
      phone: '+91 98765 00000',
      subject: 'DGCA Type Certification advisory',
      message:
        'Seeded demo enquiry for admin queue review. Replace with real leads after go-live.',
      sourcePage: '/enquiry?service=compliance',
      status: EnquiryStatus.NEW,
    },
  });
  console.log('Seeded demo enquiry for admin queue');
}

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    await upsertDemoUser(account);
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: (process.env.ADMIN_EMAIL ?? 'admin@garudhub.local').toLowerCase() },
    select: { id: true },
  });
  if (adminUser) {
    await seedPublishedGovOpportunities(adminUser.id);
  } else {
    console.log('Admin user not found; skipping gov opportunity seed.');
  }

  await seedDemoCatalogListings();

  const seedTransactions = process.env.SEED_DEMO_TRANSACTIONS === 'true';
  if (seedTransactions) {
    await seedDemoOrders();
    await seedDemoEnquiry();
  } else {
    console.log(
      'Skipped demo orders/enquiries (set SEED_DEMO_TRANSACTIONS=true to seed sample order + enquiry).',
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
