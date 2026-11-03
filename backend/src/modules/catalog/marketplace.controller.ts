import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogCategory, ListingType } from '@prisma/client';
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
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Public listing detail' })
  getListing(@Param('id') id: string) {
    return this.catalogService.getPublicListing(id);
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
