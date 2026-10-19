import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CatalogCategory,
  FulfillmentStatus,
  ListingReviewStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { AdminService } from './admin.service';
import {
  ApproveListingDto,
  CancelOrderDto,
  RejectApplicationDto,
  RejectListingDto,
  UnpublishListingDto,
  UpdateOrderPaymentDto,
} from './dto/admin.dto';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { DocumentsService } from '../documents/documents.service';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get('applications')
  @ApiOperation({ summary: 'List partner verification applications' })
  @ApiQuery({ name: 'status', enum: VerificationStatus, required: false })
  @ApiOkResponse({ description: 'Organizations with owner user summary' })
  listApplications(@Query('status') status?: VerificationStatus) {
    return this.adminService.listApplications(status);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Application detail including uploaded documents' })
  getApplication(@Param('id') id: string) {
    return this.adminService.getApplication(id);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download an application document' })
  @Header('Content-Type', 'application/octet-stream')
  downloadDocument(@Param('id') id: string): Promise<StreamableFile> {
    return this.documentsService.downloadForAdmin(id);
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: 'Approve a submitted application' })
  approve(@Param('id') id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.adminService.approveApplication(id, admin.userId);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject a submitted application' })
  reject(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.adminService.rejectApplication(id, admin.userId, dto);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List partner catalog listings for moderation' })
  @ApiQuery({ name: 'status', enum: ListingReviewStatus, required: false })
  @ApiQuery({ name: 'category', enum: CatalogCategory, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  listListings(
    @Query('status') status?: ListingReviewStatus,
    @Query('category') category?: CatalogCategory,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.adminService.listListings({
      status,
      category,
      skip: skip != null ? Number(skip) : undefined,
      take: take != null ? Number(take) : undefined,
    });
  }

  @Get('listings/:id')
  @ApiOperation({
    summary: 'Listing moderation detail with partner info and audit logs',
  })
  getListing(@Param('id') id: string) {
    return this.adminService.getListing(id);
  }

  @Post('listings/:id/approve')
  @ApiOperation({ summary: 'Approve a listing to go live on marketplace' })
  approveListing(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto?: ApproveListingDto,
  ) {
    return this.adminService.approveListing(id, admin.userId, dto);
  }

  @Post('listings/:id/reject')
  @ApiOperation({ summary: 'Reject a submitted listing with reason' })
  rejectListing(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: RejectListingDto,
  ) {
    return this.adminService.rejectListing(id, admin.userId, dto);
  }

  @Post('listings/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish/takedown a live listing' })
  unpublishListing(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UnpublishListingDto,
  ) {
    return this.adminService.unpublishListing(id, admin.userId, dto);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'List platform commerce orders with metrics and filters',
  })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({
    name: 'fulfillmentStatus',
    enum: FulfillmentStatus,
    required: false,
  })
  @ApiQuery({ name: 'paymentStatus', enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  listOrders(
    @Query('status') status?: OrderStatus,
    @Query('fulfillmentStatus') fulfillmentStatus?: FulfillmentStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('search') search?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.adminService.listOrders({
      status,
      fulfillmentStatus,
      paymentStatus,
      search,
      skip: skip != null ? Number(skip) : undefined,
      take: take != null ? Number(take) : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Order detail with buyer, seller, and line items' })
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel an order on platform' })
  cancelOrder(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CancelOrderDto,
  ) {
    return this.adminService.cancelOrder(id, admin.userId, dto.reason);
  }

  @Post('orders/:id/payment')
  @ApiOperation({ summary: 'Update payment status for an order' })
  updateOrderPayment(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateOrderPaymentDto,
  ) {
    return this.adminService.updateOrderPayment(
      id,
      admin.userId,
      dto.paymentStatus,
    );
  }
}
