import { Injectable, NotFoundException } from '@nestjs/common';
import { EnquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateEnquiryDto, UpdateEnquiryStatusDto } from './dto/enquiry.dto';

export type ListEnquiriesParams = {
  status?: EnquiryStatus;
  skip?: number;
  take?: number;
};

@Injectable()
export class EnquiryService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEnquiryDto) {
    return this.prisma.enquiry.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        sourcePage: dto.sourcePage?.trim() || null,
      },
    });
  }

  async listForAdmin(params: ListEnquiriesParams = {}) {
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const where: Prisma.EnquiryWhereInput = params.status
      ? { status: params.status }
      : {};

    const [items, total, newCount, readCount] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.enquiry.count({ where }),
      this.prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } }),
      this.prisma.enquiry.count({ where: { status: EnquiryStatus.READ } }),
    ]);

    return {
      items,
      total,
      skip,
      take,
      statusCounts: {
        NEW: newCount,
        READ: readCount,
      },
    };
  }

  async updateStatus(id: string, dto: UpdateEnquiryStatusDto) {
    try {
      return await this.prisma.enquiry.update({
        where: { id },
        data: { status: dto.status },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Enquiry not found');
      }
      throw e;
    }
  }
}
