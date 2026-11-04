import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { InAppNotificationService } from './in-app-notification.service';
import { MailService } from './mail.service';
import { NotificationService } from './notification.service';
import { MAIL_PROVIDER } from './notification.types';
import { NotificationsController } from './notifications.controller';

/**
 * Notification channels sit behind ports:
 * - email → `MAIL_PROVIDER` (default `MailService`: SMTP or log-only)
 * - in-app → `InAppNotificationService` (Prisma `InAppNotification`)
 * Domain code only calls `NotificationService`.
 */
@Global()
@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController],
  providers: [
    MailService,
    { provide: MAIL_PROVIDER, useExisting: MailService },
    InAppNotificationService,
    NotificationService,
  ],
  exports: [
    MailService,
    MAIL_PROVIDER,
    InAppNotificationService,
    NotificationService,
  ],
})
export class NotificationsModule {}
