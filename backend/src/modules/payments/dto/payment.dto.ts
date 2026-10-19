import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Order ID to initiate payment for' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({
    enum: PaymentGateway,
    default: PaymentGateway.RAZORPAY,
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Razorpay order ID returned by gateway' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Razorpay payment ID returned after payment' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'HMAC signature returned by Razorpay checkout' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}

export class SubmitBankTransferDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Bank transfer UTR / Reference number' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 40)
  utrNumber: string;

  @ApiPropertyOptional({
    description: 'Name of the sender bank (e.g. HDFC, SBI)',
  })
  @IsOptional()
  @IsString()
  senderBankName?: string;

  @ApiPropertyOptional({ description: 'Optional payment notes or reference' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminVerifyBankTransferDto {
  @ApiProperty({ description: 'Payment transaction ID to review' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    enum: ['APPROVE', 'REJECT'],
    description: 'Verification decision',
  })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Reason if rejecting the UTR' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
