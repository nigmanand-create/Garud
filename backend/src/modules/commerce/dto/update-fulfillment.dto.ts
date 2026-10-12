import { FulfillmentStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

const FULFILLMENT_STATUSES = Object.values(
  FulfillmentStatus,
) as FulfillmentStatus[];

export class UpdateOrderFulfillmentDto {
  @IsIn(FULFILLMENT_STATUSES)
  fulfillmentStatus!: FulfillmentStatus;
}
