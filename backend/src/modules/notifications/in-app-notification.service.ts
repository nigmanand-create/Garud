import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { InAppNotificationInput } from './notification.types';

/** Minimal in-app notification store (bell count + recent list). */
@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Best-effort create; never throws (notifications must not break business flows). */
  async create(input: InAppNotificationInput): Promise<boolean> {
    if (!input.userId) return false;
    try {
      await this.prisma.inAppNotification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title.slice(0, 200),
          body: input.body?.slice(0, 1000) ?? null,
          href: input.href ?? null,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `In-app notification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async list(userId: string, take = 20) {
    const limit = Math.min(Math.max(Math.trunc(take) || 20, 1), 50);
    const [items, unreadCount] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.unreadCount(userId),
    ]);
    return { items, unreadCount };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.inAppNotification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
