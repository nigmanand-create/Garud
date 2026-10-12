import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListingMediaService } from './listing-media.service';

@ApiTags('Media')
@Controller('media/listings')
export class ListingMediaController {
  constructor(private readonly listingMediaService: ListingMediaService) {}

  @Get(':orgId/:fileName')
  @ApiOperation({ summary: 'Serve listing image (public)' })
  @Header('Cache-Control', 'public, max-age=86400')
  serve(
    @Param('orgId') orgId: string,
    @Param('fileName') fileName: string,
  ) {
    return this.listingMediaService.serveListingImage(orgId, fileName);
  }
}
