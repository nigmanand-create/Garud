import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import {
  AdminVerifyBankTransferDto,
  CreatePaymentIntentDto,
  SubmitBankTransferDto,
  VerifyRazorpayPaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.GOVERNMENT, UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Create payment intent / order with gateway (Razorpay / Sandbox)',
  })
  createIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      user.userId,
      user.role,
      dto,
    );
  }

  @Post('verify-razorpay')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.GOVERNMENT, UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Verify Razorpay payment signature & update order to PAID',
  })
  verifyRazorpay(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    return this.paymentsService.verifyRazorpayPayment(
      user.userId,
      user.role,
      dto,
    );
  }

  @Post('bank-transfer')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.GOVERNMENT, UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Submit corporate B2B bank transfer (NEFT/RTGS UTR number)',
  })
  submitBankTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitBankTransferDto,
  ) {
    return this.paymentsService.submitBankTransfer(user.userId, user.role, dto);
  }

  @Get('order/:orderId')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment transactions audit list for an order' })
  getOrderTransactions(@Param('orderId') orderId: string) {
    return this.paymentsService.getOrderTransactions(orderId);
  }

  @Post('admin/verify-utr')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Admin bank reconciliation: Approve or reject UTR transfer',
  })
  adminVerifyUtr(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminVerifyBankTransferDto,
  ) {
    return this.paymentsService.adminVerifyBankTransfer(admin.userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public webhook endpoint for Razorpay payment events',
  })
  webhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    return this.paymentsService.handleRazorpayWebhook(rawBody, signature);
  }
}
