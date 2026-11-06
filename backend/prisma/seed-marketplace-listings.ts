import { ListingReviewStatus, PrismaClient } from '@prisma/client';
import { MARKETPLACE_DRONE_SEEDS } from './marketplace-drone-seeds';

/** Upsert GarudHub-inspired marketplace listings on the demo partner org. */
export async function seedMarketplaceListingsForPartner(
  prisma: PrismaClient,
  partnerEmail = 'partner@garudhub.local',
): Promise<number> {
  const partner = await prisma.user.findUnique({
    where: { email: partnerEmail },
    include: { organization: true },
  });
  if (!partner?.organization) {
    console.warn(`Partner ${partnerEmail} not found — skip marketplace listing seed.`);
    return 0;
  }

  const orgId = partner.organization.id;
  let upserted = 0;

  for (const sample of MARKETPLACE_DRONE_SEEDS) {
    const isPublished = sample.isPublished ?? true;
    const reviewStatus = sample.reviewStatus ?? ListingReviewStatus.APPROVED;
    const listingData = {
      listingType: sample.listingType,
      category: sample.category,
      name: sample.name,
      sku: sample.sku,
      brand: sample.brand ?? 'Garud Demo',
      description: sample.description,
      technicalSpecs: sample.technicalSpecs.trim() || null,
      applications: sample.applications,
      primaryImageUrl: sample.primaryImageUrl,
      galleryImageUrls: sample.galleryImageUrls ?? [],
      minOrderQuantity: sample.minOrderQuantity,
      priceOnRequest: sample.priceOnRequest,
      priceInr: sample.priceInr,
      isPublished,
      reviewStatus,
      featuredOnMarketplace: sample.featuredOnMarketplace ?? false,
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
    } else {
      await prisma.partnerListing.create({
        data: { organizationId: orgId, ...listingData },
      });
    }
    upserted += 1;
    console.log(`Listing seed: ${sample.sku} — ${sample.name}`);
  }

  return upserted;
}
