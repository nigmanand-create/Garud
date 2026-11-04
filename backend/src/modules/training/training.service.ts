import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StudentLeadStatus,
  TrainingBatchStatus,
  TrainingCourseType,
  TrainingMode,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { EnquiryService } from '../enquiries/enquiry.service';
import {
  CourseInterestDto,
  CreateBatchDto,
  CreateCourseDto,
  InstituteProfileDto,
  UpdateBatchDto,
  UpdateStudentLeadDto,
  UpdateCourseDto,
} from './dto/training.dto';
import { formatInterestMessage, resolveBatchStatus } from './training.rules';

const ORG_PUBLIC = {
  select: {
    id: true,
    companyName: true,
    state: true,
    city: true,
    instituteProfile: {
      select: {
        accreditation: true,
        rptoApprovalNo: true,
        locations: true,
      },
    },
  },
} as const;

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enquiries: EnquiryService,
  ) {}

  // --- partner (institute) ----------------------------------------------------

  private async requireInstituteOrg(user: AuthenticatedUser) {
    if (user.accountType !== 'TRAINING_INSTITUTE') {
      throw new ForbiddenException(
        'Training courses are managed by training institute accounts',
      );
    }
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: user.userId },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('Partner organization not found');
    return org.id;
  }

  async getProfile(user: AuthenticatedUser) {
    const organizationId = await this.requireInstituteOrg(user);
    const profile = await this.prisma.instituteProfile.findUnique({
      where: { organizationId },
    });
    return (
      profile ?? {
        organizationId,
        accreditation: null,
        rptoApprovalNo: null,
        about: null,
        locations: [],
        scheduleNotes: null,
      }
    );
  }

  async updateProfile(user: AuthenticatedUser, dto: InstituteProfileDto) {
    const organizationId = await this.requireInstituteOrg(user);
    const data = {
      accreditation: dto.accreditation?.trim() || null,
      rptoApprovalNo: dto.rptoApprovalNo?.trim() || null,
      about: dto.about?.trim() || null,
      locations: (dto.locations ?? []).map((l) => l.trim()).filter(Boolean),
      scheduleNotes: dto.scheduleNotes?.trim() || null,
    };
    return this.prisma.instituteProfile.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }

  async listOwnCourses(user: AuthenticatedUser) {
    const organizationId = await this.requireInstituteOrg(user);
    const items = await this.prisma.trainingCourse.findMany({
      where: { organizationId },
      include: { batches: { orderBy: { startDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  async createCourse(user: AuthenticatedUser, dto: CreateCourseDto) {
    const organizationId = await this.requireInstituteOrg(user);
    return this.prisma.trainingCourse.create({
      data: {
        organizationId,
        title: dto.title.trim(),
        courseType: dto.courseType,
        mode: dto.mode,
        description: dto.description?.trim() || null,
        durationDays: dto.durationDays ?? null,
        feeInr: dto.feeInr ?? null,
        eligibility: dto.eligibility?.trim() || null,
        isPublished: dto.isPublished ?? false,
      },
      include: { batches: true },
    });
  }

  private async ownCourse(user: AuthenticatedUser, courseId: string) {
    const organizationId = await this.requireInstituteOrg(user);
    const course = await this.prisma.trainingCourse.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async updateCourse(
    user: AuthenticatedUser,
    courseId: string,
    dto: UpdateCourseDto,
  ) {
    await this.ownCourse(user, courseId);
    return this.prisma.trainingCourse.update({
      where: { id: courseId },
      data: {
        title: dto.title?.trim(),
        courseType: dto.courseType,
        mode: dto.mode,
        description: dto.description?.trim(),
        durationDays: dto.durationDays,
        feeInr: dto.feeInr,
        eligibility: dto.eligibility?.trim(),
        isPublished: dto.isPublished,
      },
      include: { batches: { orderBy: { startDate: 'asc' } } },
    });
  }

  async deleteCourse(user: AuthenticatedUser, courseId: string) {
    await this.ownCourse(user, courseId);
    await this.prisma.trainingCourse.delete({ where: { id: courseId } });
    return { deleted: true };
  }

  private checkDates(start: Date, end?: Date | null) {
    if (end && end < start) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }

  async createBatch(
    user: AuthenticatedUser,
    courseId: string,
    dto: CreateBatchDto,
  ) {
    await this.ownCourse(user, courseId);
    const start = new Date(dto.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : null;
    this.checkDates(start, end);
    const filled = dto.seatsFilled ?? 0;
    if (filled > dto.seats) {
      throw new BadRequestException('Seats filled cannot exceed total seats');
    }
    return this.prisma.trainingBatch.create({
      data: {
        courseId,
        startDate: start,
        endDate: end,
        seats: dto.seats,
        seatsFilled: filled,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        status: resolveBatchStatus(dto.status, dto.seats, filled),
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateBatch(
    user: AuthenticatedUser,
    batchId: string,
    dto: UpdateBatchDto,
  ) {
    const organizationId = await this.requireInstituteOrg(user);
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: batchId, course: { organizationId } },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    const start = dto.startDate ? new Date(dto.startDate) : batch.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : batch.endDate;
    this.checkDates(start, end);
    const seats = dto.seats ?? batch.seats;
    const filled = dto.seatsFilled ?? batch.seatsFilled;
    if (filled > seats) {
      throw new BadRequestException('Seats filled cannot exceed total seats');
    }
    return this.prisma.trainingBatch.update({
      where: { id: batchId },
      data: {
        startDate: start,
        endDate: end,
        seats,
        seatsFilled: filled,
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        status: resolveBatchStatus(dto.status ?? batch.status, seats, filled),
        notes: dto.notes?.trim(),
      },
    });
  }

  async deleteBatch(user: AuthenticatedUser, batchId: string) {
    const organizationId = await this.requireInstituteOrg(user);
    const batch = await this.prisma.trainingBatch.findFirst({
      where: { id: batchId, course: { organizationId } },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.prisma.trainingBatch.delete({ where: { id: batchId } });
    return { deleted: true };
  }

  // --- public ------------------------------------------------------------------

  private publicWhere(): Prisma.TrainingCourseWhereInput {
    return {
      isPublished: true,
      organization: { verificationStatus: VerificationStatus.APPROVED },
    };
  }

  private upcomingBatches() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return {
      where: {
        status: {
          in: [TrainingBatchStatus.OPEN, TrainingBatchStatus.FULL],
        },
        startDate: { gte: startOfToday },
      },
      orderBy: { startDate: 'asc' as const },
    };
  }

  async listPublic(
    params: {
      type?: TrainingCourseType;
      mode?: TrainingMode;
      state?: string;
      q?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const take = Math.min(Math.max(params.take ?? 24, 1), 60);
    const skip = Math.max(params.skip ?? 0, 0);
    const q = params.q?.trim();
    const state = params.state?.trim();
    const where: Prisma.TrainingCourseWhereInput = {
      ...this.publicWhere(),
      ...(params.type ? { courseType: params.type } : {}),
      ...(params.mode ? { mode: params.mode } : {}),
      ...(state
        ? {
            OR: [
              {
                batches: {
                  some: { state: { equals: state, mode: 'insensitive' } },
                },
              },
              {
                organization: {
                  state: { equals: state, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                  {
                    organization: {
                      companyName: { contains: q, mode: 'insensitive' },
                    },
                  },
                ],
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.trainingCourse.findMany({
        where,
        include: {
          organization: ORG_PUBLIC,
          batches: this.upcomingBatches(),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.trainingCourse.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getPublic(id: string) {
    const course = await this.prisma.trainingCourse.findFirst({
      where: { id, ...this.publicWhere() },
      include: {
        organization: ORG_PUBLIC,
        batches: this.upcomingBatches(),
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  /** Public course interest → routed enquiry (lead type TRAINING) in the institute's inbox. */
  async expressInterest(
    courseId: string,
    dto: CourseInterestDto,
    userId?: string | null,
  ) {
    const course = await this.getPublic(courseId);
    let batchLabel: string | null = null;
    if (dto.batchId) {
      const batch = course.batches.find((b) => b.id === dto.batchId);
      if (!batch) {
        throw new BadRequestException(
          'Selected batch is not open for enrolment',
        );
      }
      batchLabel = `${batch.startDate.toISOString().slice(0, 10)}${
        batch.city ? ` — ${batch.city}` : ''
      }`;
    }
    const enquiry = await this.enquiries.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      subject: `Course interest: ${course.title}`.slice(0, 300),
      message: formatInterestMessage({
        courseTitle: course.title,
        batchLabel,
        message: dto.message,
      }),
      sourcePage: `/training/${course.id}`,
      intent: 'TRAINING',
      serviceKey: 'training',
      organizationId: course.organizationId,
    });
    await this.prisma.$transaction([
      this.prisma.studentTrainingLead.create({
        data: {
          enquiryId: enquiry.id,
          courseId: course.id,
          batchId: dto.batchId ?? null,
          organizationId: course.organizationId,
          userId: userId ?? null,
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone?.trim() || null,
          city: dto.city?.trim() || null,
          message: dto.message?.trim() || null,
        },
      }),
      // Single partner inbox row: institute uses training lead; drop duplicate Lead.
      this.prisma.lead.deleteMany({ where: { enquiryId: enquiry.id } }),
    ]);
    return { id: enquiry.id, routed: Boolean(enquiry.organizationId) };
  }

  // --- student leads (institute inbox) -----------------------------------------

  async listStudentLeads(
    user: AuthenticatedUser,
    params: {
      status?: StudentLeadStatus;
      courseId?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const organizationId = await this.requireInstituteOrg(user);
    const take = Math.min(Math.max(params.take ?? 50, 1), 100);
    const skip = Math.max(params.skip ?? 0, 0);
    const where: Prisma.StudentTrainingLeadWhereInput = {
      organizationId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.courseId ? { courseId: params.courseId } : {}),
    };
    const [items, total, groups] = await Promise.all([
      this.prisma.studentTrainingLead.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          batch: { select: { id: true, startDate: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.studentTrainingLead.count({ where }),
      this.prisma.studentTrainingLead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);
    const statusCounts: Record<StudentLeadStatus, number> = {
      NEW: 0,
      CONTACTED: 0,
      ENROLLED: 0,
      CLOSED: 0,
    };
    for (const g of groups) statusCounts[g.status] = g._count._all;
    return { items, total, skip, take, statusCounts };
  }

  async updateStudentLead(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStudentLeadDto,
  ) {
    const organizationId = await this.requireInstituteOrg(user);
    const lead = await this.prisma.studentTrainingLead.findFirst({
      where: { id, organizationId },
    });
    if (!lead) throw new NotFoundException('Student lead not found');
    return this.prisma.studentTrainingLead.update({
      where: { id },
      data: {
        status: dto.status,
        partnerNote: dto.partnerNote?.trim(),
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, startDate: true, city: true } },
      },
    });
  }
}
