import {
  AccountType,
  CatalogCategory,
  ListingType,
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

async function seedDemoCatalogListings() {
  const partner = await prisma.user.findUnique({
    where: { email: 'partner@garudhub.local' },
    include: { organization: true },
  });
  if (!partner?.organization) return;

  const orgId = partner.organization.id;
  const samples = [
    {
      name: 'Garud AgriSpray X1',
      sku: 'GD-AGRI-X1',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.AGRICULTURE_DRONE,
      priceOnRequest: false,
      priceInr: 285000,
      minOrderQuantity: 1,
    },
    {
      name: 'SurveyMapper Pro 40',
      sku: 'GD-SURV-40',
      listingType: ListingType.PRODUCT,
      category: CatalogCategory.SURVEY_MAPPING_DRONE,
      priceOnRequest: true,
      priceInr: null,
      minOrderQuantity: 2,
    },
  ];

  for (const sample of samples) {
    const listingData = {
      listingType: sample.listingType,
      category: sample.category,
      name: sample.name,
      sku: sample.sku,
      brand: 'Garud Demo',
      description:
        'Demo catalog item for marketplace QA — images and pricing for checkout design.',
      primaryImageUrl: DEMO_LISTING_IMAGE,
      galleryImageUrls: [] as string[],
      minOrderQuantity: sample.minOrderQuantity,
      priceOnRequest: sample.priceOnRequest,
      priceInr: sample.priceInr,
      isPublished: true,
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

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    await upsertDemoUser(account);
  }
  await seedDemoCatalogListings();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
