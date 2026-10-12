import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, UserRole, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { isPartnerAccountType } from '../identity/account-type.util';
import { UpdatePartnerApplicationDto } from './dto/partner-application.dto';

const EDITABLE_STATUSES: VerificationStatus[] = [
  VerificationStatus.DRAFT,
  VerificationStatus.REJECTED,
];

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyApplication(userId: string, role: UserRole) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      include: {
        _count: { select: { documents: true, listings: true } },
      },
    });
    if (!org) {
      throw new NotFoundException('Organization profile not found');
    }
    const { _count, ...profile } = org;
    return {
      ...profile,
      documentCount: _count.documents,
      listingCount: _count.listings,
      canEdit: EDITABLE_STATUSES.includes(org.verificationStatus),
      canListProducts:
        role === UserRole.PARTNER
          ? org.verificationStatus === VerificationStatus.APPROVED
          : true,
    };
  }

  async updateApplication(
    userId: string,
    accountType: AccountType,
    dto: UpdatePartnerApplicationDto,
  ) {
    if (!isPartnerAccountType(accountType)) {
      throw new ForbiddenException(
        'Only partner account types use the verification application flow',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization profile not found');
    }
    if (!EDITABLE_STATUSES.includes(org.verificationStatus)) {
      throw new BadRequestException(
        'Application cannot be edited in current status',
      );
    }

    return this.prisma.organization.update({
      where: { id: org.id },
      data: {
        ...dto,
        rejectionReason:
          org.verificationStatus === VerificationStatus.REJECTED
            ? null
            : org.rejectionReason,
      },
    });
  }

  async submitApplication(userId: string, accountType: AccountType) {
    if (!isPartnerAccountType(accountType)) {
      throw new ForbiddenException(
        'Only partner account types require submission for verification',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization profile not found');
    }
    if (!EDITABLE_STATUSES.includes(org.verificationStatus)) {
      throw new BadRequestException(
        'Application already submitted or under review',
      );
    }

    this.assertRequiredForSubmit(org);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.organization.update({
        where: { id: org.id },
        data: {
          verificationStatus: VerificationStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
      await tx.verificationAuditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: userId,
          fromStatus: org.verificationStatus,
          toStatus: VerificationStatus.SUBMITTED,
          note: 'Partner submitted application',
        },
      });
      return result;
    });

    return updated;
  }

  private assertRequiredForSubmit(org: {
    companyName: string;
    country: string;
    contactPersonName: string;
    contactEmail: string;
    contactMobile: string;
  }) {
    const missing: string[] = [];
    if (!org.companyName?.trim()) missing.push('companyName');
    if (!org.country?.trim()) missing.push('country');
    if (!org.contactPersonName?.trim()) missing.push('contactPersonName');
    if (!org.contactEmail?.trim()) missing.push('contactEmail');
    if (!org.contactMobile?.trim()) missing.push('contactMobile');
    if (missing.length) {
      throw new BadRequestException(
        `Complete required fields before submit: ${missing.join(', ')}`,
      );
    }
  }
}
