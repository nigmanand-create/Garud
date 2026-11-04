import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StartConversationDto {
  @ApiProperty({ description: 'Verified partner organization to message' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Listing the conversation is about' })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @ApiProperty({ example: 'Question about AgriSpray X10' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;
}
