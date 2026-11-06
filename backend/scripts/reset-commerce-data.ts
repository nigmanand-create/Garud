/**
 * Wipe transactional / catalog demo data while preserving login accounts.
 *
 * Local fresh start:
 *   cd backend && npx ts-node scripts/reset-commerce-data.ts
 *   npm run prisma:seed
 *
 * Or one-shot wipe + re-seed listings (users unchanged):
 *   cd backend && npx ts-node scripts/reset-commerce-data.ts --seed-listings
 *
 * Requires DATABASE_URL in backend/.env (same as Prisma).
 */
import { PrismaClient } from '@prisma/client';
import { seedMarketplaceListingsForPartner } from '../prisma/seed-marketplace-listings';

const prisma = new PrismaClient();

const shouldSeedListings = process.argv.includes('--seed-listings');

async function wipeCommerceData(): Promise<void> {
  console.log('Wiping commerce / vertical test data (preserving users & organizations)...');

  await prisma.$transaction([
    prisma.paymentTransaction.deleteMany(),
    prisma.orderLineItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.rfqInvite.deleteMany(),
    prisma.rfq.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.serviceRequestMatch.deleteMany(),
    prisma.serviceRequestUpdate.deleteMany(),
    prisma.studentTrainingLead.deleteMany(),
    prisma.serviceRequest.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.enquiry.deleteMany(),
    prisma.trainingBatch.deleteMany(),
    prisma.trainingCourse.deleteMany(),
    prisma.instituteProfile.deleteMany(),
    prisma.listingModerationAuditLog.deleteMany(),
    prisma.listingView.deleteMany(),
    prisma.partnerListing.deleteMany(),
    prisma.partnershipRequest.deleteMany(),
    prisma.govOpportunityBid.deleteMany(),
    prisma.govOpportunity.deleteMany(),
    prisma.inAppNotification.deleteMany(),
    prisma.adminUserAuditLog.deleteMany(),
  ]);

  console.log('Commerce wipe complete.');
}

async function printCounts(): Promise<void> {
  const [orders, listings, enquiries, rfqs, users] = await Promise.all([
    prisma.order.count(),
    prisma.partnerListing.count(),
    prisma.enquiry.count(),
    prisma.rfq.count(),
    prisma.user.count(),
  ]);
  console.log(
    `Counts — users: ${users}, orders: ${orders}, listings: ${listings}, enquiries: ${enquiries}, rfqs: ${rfqs}`,
  );
}

async function main(): Promise<void> {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_COMMERCE_RESET !== 'true'
  ) {
    console.error(
      'Refusing commerce reset in NODE_ENV=production. Set ALLOW_COMMERCE_RESET=true for a one-off staging wipe.',
    );
    process.exit(1);
  }

  await wipeCommerceData();

  if (shouldSeedListings) {
    await seedMarketplaceListingsForPartner(prisma);
  }

  await printCounts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
