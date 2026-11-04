import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import {
  BuyerMessagesController,
  PartnerMessagesController,
} from './messages.controllers';
import { MessagesService } from './messages.service';

@Module({
  imports: [IdentityModule],
  controllers: [BuyerMessagesController, PartnerMessagesController],
  providers: [MessagesService, VerifiedPartnerGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
