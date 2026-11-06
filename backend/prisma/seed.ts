import {
  AccountType,
  EnquiryStatus,
  FulfillmentStatus,
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
