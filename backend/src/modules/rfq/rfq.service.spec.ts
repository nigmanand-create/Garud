import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountType,
  CatalogCategory,
  ListingReviewStatus,
  ListingType,
  QuotationStatus,
  RfqInviteStatus,
  RfqStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RfqMatchingService } from './rfq-matching.service';
import { RfqService } from './rfq.service';

describe('RfqService - RFQ & Vendor Bidding Lifecycle (TASK-005)', () => {
  let service: RfqService;
  let prisma: PrismaService;

  let buyerUserId: string;
  let otherBuyerUserId: string;

  let partnerUserId: string;
  let partnerOrgId: string;
  let otherPartnerUserId: string;

  const createdRfqIds: string[] = [];
  const createdListingIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RfqService, RfqMatchingService, PrismaService],
    }).compile();

    service = module.get<RfqService>(RfqService);
    prisma = module.get<PrismaService>(PrismaService);

    // 1. Fetch Primary Buyer
    const buyer = await prisma.user.findFirst({
      where: { role: UserRole.BUYER },
      include: { organization: true },
    });
    if (!buyer || !buyer.organization) {
      throw new Error('Test prerequisite: Seeded buyer user/org not found');
    }
    buyerUserId = buyer.id;

    // 2. Fetch or create a second buyer for isolation testing
    let otherBuyer = await prisma.user.findFirst({
      where: { role: UserRole.BUYER, id: { not: buyerUserId } },
      include: { organization: true },
    });
    if (!otherBuyer || !otherBuyer.organization) {
      otherBuyer = await prisma.user.create({
        data: {
          email: `rfq-other-buyer-${Date.now()}@garudhub.test`,
          passwordHash: '$2b$10$mockhashforunittestingonly',
          role: UserRole.BUYER,
          accountType: AccountType.BUYER_ENTERPRISE,
          organization: {
            create: {
              companyName: 'Second Buyer Org Ltd',
              country: 'India',
              contactPersonName: 'Second Officer',
              contactEmail: `secbuyer-${Date.now()}@garudhub.test`,
              contactMobile: '+91 97777 66666',
            },
          },
        },
        include: { organization: true },
      });
    }
    otherBuyerUserId = otherBuyer.id;

    // 3. Fetch Primary Partner
    const partner = await prisma.user.findFirst({
      where: { role: UserRole.PARTNER },
      include: { organization: true },
    });
    if (!partner || !partner.organization) {
      throw new Error('Test prerequisite: Seeded partner user/org not found');
    }
    partnerUserId = partner.id;
    partnerOrgId = partner.organization.id;

    // Ensure partner organization is APPROVED
    await prisma.organization.update({
      where: { id: partnerOrgId },
      data: { verificationStatus: VerificationStatus.APPROVED },
    });

    // Ensure partner has an approved listing in PROPULSION category for matching tests
    let partnerListing = await prisma.partnerListing.findFirst({
      where: {
        organizationId: partnerOrgId,
        category: CatalogCategory.COMPONENT,
      },
    });
    if (!partnerListing) {
      partnerListing = await prisma.partnerListing.create({
        data: {
          organizationId: partnerOrgId,
          name: 'High Thrust Brushless Motor 100KV',
          category: CatalogCategory.COMPONENT,
          listingType: ListingType.PRODUCT,
          priceInr: 35000,
          isPublished: true,
          reviewStatus: ListingReviewStatus.APPROVED,
          country: 'India',
        },
      });
      createdListingIds.push(partnerListing.id);
    }

    // 4. Fetch or create a second partner
    let otherPartner = await prisma.user.findFirst({
      where: { role: UserRole.PARTNER, id: { not: partnerUserId } },
      include: { organization: true },
    });
    if (!otherPartner || !otherPartner.organization) {
      otherPartner = await prisma.user.create({
        data: {
          email: `rfq-other-partner-${Date.now()}@garudhub.test`,
          passwordHash: '$2b$10$mockhashforunittestingonly',
          role: UserRole.PARTNER,
          accountType: AccountType.MANUFACTURER,
          organization: {
            create: {
              companyName: 'Second Drone Tech Ltd',
              country: 'India',
              contactPersonName: 'Vendor Two',
              contactEmail: `vendor2-${Date.now()}@garudhub.test`,
              contactMobile: '+91 98888 77777',
              verificationStatus: VerificationStatus.APPROVED,
            },
          },
        },
        include: { organization: true },
      });
    }
    otherPartnerUserId = otherPartner.id;
  });

  afterAll(async () => {
    if (createdRfqIds.length > 0) {
      await prisma.quotation.deleteMany({
        where: { rfqId: { in: createdRfqIds } },
      });
      await prisma.rfqInvite.deleteMany({
        where: { rfqId: { in: createdRfqIds } },
      });
      await prisma.rfq.deleteMany({
        where: { id: { in: createdRfqIds } },
      });
    }
    if (createdListingIds.length > 0) {
      await prisma.partnerListing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. RFQ Creation & Automated Partner Matching', () => {
    it('creates an RFQ and auto-matches verified vendors with matching listings', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Need 50 Drone Brushless Motors',
        description: 'Heavy lift motors with 15kg thrust capability',
        category: CatalogCategory.COMPONENT,
        listingType: ListingType.PRODUCT,
        quantity: 50,
        deadlineAt: futureDate.toISOString(),
      });

      createdRfqIds.push(rfq.id);

      expect(rfq.id).toBeDefined();
      expect(rfq.status).toBe(RfqStatus.OPEN);
      expect(rfq.buyerUserId).toBe(buyerUserId);
      expect(rfq._count.invites).toBeGreaterThanOrEqual(1);

      // Verify the invite exists in DB
      const invite = await prisma.rfqInvite.findFirst({
        where: { rfqId: rfq.id, vendorOrganizationId: partnerOrgId },
      });
      expect(invite).toBeDefined();
      expect(invite?.status).toBe(RfqInviteStatus.INVITED);
    });

    it('rejects RFQ creation if role is not BUYER or GOVERNMENT', async () => {
      await expect(
        service.createRfq(partnerUserId, UserRole.PARTNER, {
          title: 'Partner attempting to create RFQ',
          description: 'Should be rejected',
          category: CatalogCategory.COMPONENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects RFQ creation if deadlineAt is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.createRfq(buyerUserId, UserRole.BUYER, {
          title: 'Expired Deadline RFQ',
          description: 'Should fail immediately',
          category: CatalogCategory.COMPONENT,
          deadlineAt: pastDate.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Partner Quotation Submission & Invariants', () => {
    it('allows invited partner to submit a quotation and transitions invite to QUOTED', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Propulsion Tender',
        description: 'Motors required for defense trials',
        category: CatalogCategory.COMPONENT,
        quantity: 10,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      const quoteValidity = new Date();
      quoteValidity.setDate(quoteValidity.getDate() + 30);

      const quote = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 32000,
        minOrderQuantity: 5,
        leadTimeDays: 14,
        notes: 'Includes test certification reports',
        validUntil: quoteValidity.toISOString(),
      });

      expect(quote.id).toBeDefined();
      expect(quote.status).toBe(QuotationStatus.SUBMITTED);
      expect(Number(quote.priceInr)).toBe(32000);

      // Verify invite status transitioned to QUOTED
      const invite = await prisma.rfqInvite.findFirst({
        where: { rfqId: rfq.id, vendorOrganizationId: partnerOrgId },
      });
      expect(invite?.status).toBe(RfqInviteStatus.QUOTED);
    });

    it('supersedes previous quotation when submitting an updated quote', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Motor Tender 2',
        description: 'Requirement details',
        category: CatalogCategory.COMPONENT,
        quantity: 20,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      // Quote 1
      const quote1 = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 35000,
      });
      expect(quote1.status).toBe(QuotationStatus.SUBMITTED);

      // Quote 2 (supersedes Quote 1)
      const quote2 = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 33000,
      });
      expect(quote2.status).toBe(QuotationStatus.SUBMITTED);

      // Check Quote 1 in DB is now WITHDRAWN
      const quote1Db = await prisma.quotation.findUnique({
        where: { id: quote1.id },
      });
      expect(quote1Db?.status).toBe(QuotationStatus.WITHDRAWN);
    });

    it('rejects quotation submission if RFQ deadline has passed', async () => {
      // Create RFQ with a deadline 1 second in the future
      const nearFuture = new Date(Date.now() + 50);
      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Expiring Tender',
        description: 'About to expire',
        category: CatalogCategory.COMPONENT,
        deadlineAt: nearFuture.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      // Wait 100ms for deadline to pass
      await new Promise((r) => setTimeout(r, 100));

      await expect(
        service.submitQuotation(partnerUserId, rfq.id, {
          priceInr: 30000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects quotation submission if partner has declined the RFQ', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Decline Test Tender',
        description: 'To be declined',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      // Partner declines
      await service.declineRfq(partnerUserId, rfq.id);

      // Attempting to quote after declining
      await expect(
        service.submitQuotation(partnerUserId, rfq.id, {
          priceInr: 25000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Quotation Withdrawal', () => {
    it('allows a partner to withdraw their submitted quotation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Withdraw Test Tender',
        description: 'Quotation will be withdrawn',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      const quote = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 40000,
      });

      const withdrawn = await service.withdrawQuotation(
        partnerUserId,
        quote.id,
      );
      expect(withdrawn.status).toBe(QuotationStatus.WITHDRAWN);

      // Repeating withdrawal on already withdrawn quote is rejected
      await expect(
        service.withdrawQuotation(partnerUserId, quote.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects another partner trying to withdraw quotes they do not own', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Security Tender',
        description: 'Cross-tenant isolation check',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      const quote = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 50000,
      });

      await expect(
        service.withdrawQuotation(otherPartnerUserId, quote.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. RFQ Closing, Cancellation & Comparison', () => {
    it('buyer closes RFQ and blocks further quotations', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Closing Tender',
        description: 'Will be closed by buyer',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      // Close RFQ
      const closed = await service.closeRfq(buyerUserId, rfq.id);
      expect(closed.status).toBe(RfqStatus.CLOSED);
      expect(closed.closedAt).toBeDefined();

      // Quotation on closed RFQ must be rejected
      await expect(
        service.submitQuotation(partnerUserId, rfq.id, {
          priceInr: 45000,
        }),
      ).rejects.toThrow(BadRequestException);

      // Second close attempt must be rejected
      await expect(service.closeRfq(buyerUserId, rfq.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('buyer cancels RFQ and blocks further actions', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Cancellation Tender',
        description: 'Will be cancelled',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      const cancelled = await service.cancelRfq(buyerUserId, rfq.id);
      expect(cancelled.status).toBe(RfqStatus.CANCELLED);

      // Further quotation rejected
      await expect(
        service.submitQuotation(partnerUserId, rfq.id, {
          priceInr: 45000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('buyer can compare submitted quotations and other buyers are blocked', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Comparison Tender',
        description: 'Tender with quotation to compare',
        category: CatalogCategory.COMPONENT,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 28000,
        minOrderQuantity: 10,
        leadTimeDays: 7,
      });

      const quotes = await service.compareQuotations(buyerUserId, rfq.id);
      expect(quotes.length).toBe(1);
      expect(Number(quotes[0].priceInr)).toBe(28000);
      expect(quotes[0].vendorOrganization.companyName).toBeDefined();

      // Another buyer cannot compare or access this RFQ
      await expect(
        service.compareQuotations(otherBuyerUserId, rfq.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('buyer accepts quotation: awards quote, rejects other quotes, closes RFQ, and creates Order', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      // 1. Create RFQ
      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'High-Torque Drone Propulsion Fleet',
        description: 'Motors for heavy lift cargo drone testing',
        category: CatalogCategory.COMPONENT,
        quantity: 5,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      // 2. Partner submits quote #1
      const quote1 = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 32000,
        minOrderQuantity: 1,
        leadTimeDays: 7,
      });

      // 3. Ensure other partner is invited and submits quote #2
      const otherPartnerUser = await prisma.user.findUnique({
        where: { id: otherPartnerUserId },
        include: { organization: true },
      });
      if (otherPartnerUser?.organization) {
        await prisma.rfqInvite.upsert({
          where: {
            rfqId_vendorOrganizationId: {
              rfqId: rfq.id,
              vendorOrganizationId: otherPartnerUser.organization.id,
            },
          },
          create: {
            rfqId: rfq.id,
            vendorOrganizationId: otherPartnerUser.organization.id,
            status: RfqInviteStatus.INVITED,
          },
          update: {},
        });
      }

      const quote2 = await service.submitQuotation(otherPartnerUserId, rfq.id, {
        priceInr: 35000,
        minOrderQuantity: 1,
        leadTimeDays: 14,
      });

      // 4. Foreign buyer cannot accept quote
      await expect(
        service.acceptQuotation(otherBuyerUserId, rfq.id, quote1.id),
      ).rejects.toThrow(ForbiddenException);

      // 5. RFQ owner accepts quote #1
      const acceptResult = await service.acceptQuotation(
        buyerUserId,
        rfq.id,
        quote1.id,
        {
          purchaseOrderNumber: 'PO-TEST-0099',
        },
      );

      expect(acceptResult.success).toBe(true);
      expect(acceptResult.orderId).toBeDefined();

      // Check Quote #1 is ACCEPTED
      const dbQuote1 = await prisma.quotation.findUnique({
        where: { id: quote1.id },
      });
      expect(dbQuote1?.status).toBe(QuotationStatus.ACCEPTED);

      // Check Quote #2 is REJECTED
      const dbQuote2 = await prisma.quotation.findUnique({
        where: { id: quote2.id },
      });
      expect(dbQuote2?.status).toBe(QuotationStatus.REJECTED);

      // Check RFQ is CLOSED
      const dbRfq = await prisma.rfq.findUnique({ where: { id: rfq.id } });
      expect(dbRfq?.status).toBe(RfqStatus.CLOSED);

      // Check Order created and linked correctly
      const dbOrder = await prisma.order.findUnique({
        where: { id: acceptResult.orderId },
        include: { lineItems: true },
      });
      expect(dbOrder).toBeDefined();
      expect(dbOrder?.rfqId).toBe(rfq.id);
      expect(dbOrder?.quotationId).toBe(quote1.id);
      expect(dbOrder?.status).toBe('CONFIRMED');
      expect(dbOrder?.paymentStatus).toBe('PENDING');
      expect(dbOrder?.purchaseOrderNumber).toBe('PO-TEST-0099');
      expect(Number(dbOrder?.totalInr)).toBe(32000 * 5);
      expect(dbOrder?.lineItems.length).toBe(1);
      expect(dbOrder?.lineItems[0].quantity).toBe(5);

      // Check Partner cannot withdraw ACCEPTED quote
      await expect(
        service.withdrawQuotation(partnerUserId, quote1.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('buyer can reject a specific quotation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Battery Pack Procurement',
        description: '6S 22000mAh Lipo Packs',
        category: CatalogCategory.COMPONENT,
        quantity: 2,
        deadlineAt: futureDate.toISOString(),
      });
      createdRfqIds.push(rfq.id);

      const quote = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 18000,
        minOrderQuantity: 1,
        leadTimeDays: 5,
      });

      const rejectResult = await service.rejectQuotation(
        buyerUserId,
        rfq.id,
        quote.id,
      );
      expect(rejectResult.success).toBe(true);

      const dbQuote = await prisma.quotation.findUnique({
        where: { id: quote.id },
      });
      expect(dbQuote?.status).toBe(QuotationStatus.REJECTED);
    });

    it('creates RFQ with drone technical specs and submits quotation with payload, endurance and DGCA compliance', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const rfq = await service.createRfq(buyerUserId, UserRole.BUYER, {
        title: 'Agricultural Spraying Drone RFP',
        description:
          'Heavy payload precision agri sprayer with DGCA certification',
        category: CatalogCategory.COMPONENT,
        quantity: 10,
        deadlineAt: futureDate.toISOString(),
        payloadCapacityKg: 16.5,
        enduranceMinutes: 35,
        isDgcaRequired: true,
        targetBudgetInr: 4500000,
        specsDocumentUrl: 'https://specs.garudhub.com/agri-spec-2026.pdf',
      });
      createdRfqIds.push(rfq.id);

      expect(Number(rfq.payloadCapacityKg)).toBe(16.5);
      expect(rfq.enduranceMinutes).toBe(35);
      expect(rfq.isDgcaRequired).toBe(true);
      expect(Number(rfq.targetBudgetInr)).toBe(4500000);
      expect(rfq.specsDocumentUrl).toBe(
        'https://specs.garudhub.com/agri-spec-2026.pdf',
      );

      const quote = await service.submitQuotation(partnerUserId, rfq.id, {
        priceInr: 420000,
        minOrderQuantity: 5,
        leadTimeDays: 20,
        quotedPayloadKg: 18.0,
        quotedEnduranceMin: 40,
        dgcaModelNumber: 'DGCA-UAV-AGRI-9901',
        warrantyMonths: 24,
      });

      expect(Number(quote.quotedPayloadKg)).toBe(18.0);
      expect(quote.quotedEnduranceMin).toBe(40);
      expect(quote.dgcaModelNumber).toBe('DGCA-UAV-AGRI-9901');
      expect(quote.warrantyMonths).toBe(24);
    });
  });
});
