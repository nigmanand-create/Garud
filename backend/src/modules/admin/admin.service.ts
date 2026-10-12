import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RejectApplicationDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listApplications(status?: VerificationStatus) {
    return this.prisma.organization.findMany({
      where: status ? { verificationStatus: status } : undefined,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            accountType: true,
            createdAt: true,
          },
        },
        _count: { select: { documents: true, listings: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getApplication(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            accountType: true,
            createdAt: true,
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        _count: { select: { listings: true } },
      },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    return org;
  }

  async approveApplication(orgId: string, adminUserId: string) {
    return this.transition(
      orgId,
      adminUserId,
      [VerificationStatus.SUBMITTED, VerificationStatus.UNDER_REVIEW],
      VerificationStatus.APPROVED,
      'Approved by platform admin',
    );
  }

  async rejectApplication(
    orgId: string,
    adminUserId: string,
    dto: RejectApplicationDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    if (
      org.verificationStatus !== VerificationStatus.SUBMITTED &&
      org.verificationStatus !== VerificationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Application is not pending review');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
          rejectionReason: dto.reason,
          reviewedAt: new Date(),
        },
      });
      await tx.verificationAuditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: adminUserId,
          fromStatus: org.verificationStatus,
          toStatus: VerificationStatus.REJECTED,
          note: dto.note ?? dto.reason,
        },
      });
      return updated;
    });
  }

  private async transition(
    orgId: string,
    adminUserId: string,
    allowedFrom: VerificationStatus[],
    toStatus: VerificationStatus,
    note: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Application not found');
    }
    if (!allowedFrom.includes(org.verificationStatus)) {
      throw new BadRequestException('Application is not pending review');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          verificationStatus: toStatus,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      await tx.verificationAuditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: adminUserId,
          fromStatus: org.verificationStatus,
          toStatus,
          note,
        },
      });
      return updated;
    });
  }
}
