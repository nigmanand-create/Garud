import { ApplicationDocumentType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    enum: ApplicationDocumentType,
    enumName: 'ApplicationDocumentType',
  })
  @IsEnum(ApplicationDocumentType)
  documentType: ApplicationDocumentType;
}
