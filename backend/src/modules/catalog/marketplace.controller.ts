import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { visitorKeyForListingView } from '../../shared/http/visitor-key';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccountType, CatalogCategory, ListingType } from '@prisma/client';
import { CatalogService } from './catalog.service';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Browse published listings from verified partners' })
  @ApiQuery({ name: 'listingType', enum: ListingType, required: false })
  @ApiQuery({ name: 'category', enum: CatalogCategory, required: false })
  @ApiQuery({
    name: 'categories',
    required: false,
    description: 'Comma-separated catalog categories (OR filter)',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Max 50' })
  @ApiQuery({ name: 'state', required: false, description: 'Vendor state (exact, case-insensitive)' })
  @ApiQuery({ name: 'priceType', required: false, enum: ['priced', 'rfq'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'price_asc', 'price_desc'] })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Case-insensitive search in name, description, and brand',
  })
  @ApiOkResponse({
    description: 'Paginated listings with total count for the current filters',
  })
  browse(
    @Query('listingType') listingType?: ListingType,
    @Query('category') category?: CatalogCategory,
    @Query('categories') categoriesRaw?: string,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('state') state?: string,
    @Query('priceType') priceType?: string,
    @Query('sort') sort?: string,
  ) {
    const categories = categoriesRaw
      ? (categoriesRaw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean) as CatalogCategory[])
      : undefined;

    return this.catalogService.browsePublic({
      listingType,
      category: categories?.length ? undefined : category,
      categories,
      q,
      state,
      priceType:
        priceType === 'priced' || priceType === 'rfq' ? priceType : undefined,
      sort:
        sort === 'price_asc' || sort === 'price_desc' || sort === 'newest'
          ? sort
          : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('listings/featured')
  @ApiOperation({ summary: 'Admin-curated featured marketplace listings' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Max 12' })
  featured(@Query('take') take?: string) {
    return this.catalogService.listFeaturedPublic(
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('listings/compare')
  @ApiOperation({ summary: 'Compare up to 4 published listings side by side' })
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated listing ids (max 4)' })
  compare(@Query('ids') ids?: string) {
    return this.catalogService.getPublicListingsByIds(
      ids ? ids.split(',') : [],
    );
  }

  @Get('filters')
  @ApiOperation({ summary: 'Facets for marketplace filters (states with live vendors)' })
  filters() {
    return this.catalogService.listPublicFacets();
  }

  @Get('listings/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Public listing detail' })
  async getListing(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthenticatedUser | null },
    @Res({ passthrough: true }) res: Response,
  ) {
    const listing = await this.catalogService.getPublicListing(id);
    const visitorKey = visitorKeyForListingView(req, res);
    void this.catalogService.recordListingView(
      listing.id,
      listing.organization.id,
      visitorKey,
      req.user?.userId,
    );
    return listing;
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Browse verified partner organizations with listing counts' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Max 50' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search company name, city, or state',
  })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'accountType', required: false, enum: AccountType })
  @ApiQuery({ name: 'category', required: false, enum: CatalogCategory })
  @ApiQuery({ name: 'hasListings', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'Paginated verified vendors with published listing counts',
  })
  listVendors(
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('state') state?: string,
    @Query('accountType') accountType?: string,
    @Query('category') category?: string,
    @Query('hasListings') hasListings?: string,
  ) {
    return this.catalogService.listPublicVendors({
      q,
      state,
      accountType: Object.values(AccountType).includes(accountType as AccountType)
        ? (accountType as AccountType)
        : undefined,
      category: Object.values(CatalogCategory).includes(category as CatalogCategory)
        ? (category as CatalogCategory)
        : undefined,
      hasListings: hasListings === 'true' || hasListings === '1',
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('partners/:orgId')
  @ApiOperation({ summary: 'Public verified partner profile' })
  @ApiOkResponse({
    description: 'Organization summary and published listing count',
  })
  getPartner(@Param('orgId') orgId: string) {
    return this.catalogService.getPublicPartnerProfile(orgId);
  }
}
