import type {
  TrainingBatchStatus,
  TrainingCourseType,
  TrainingMode,
} from '@/lib/platform/verticals';
import { apiRequest } from './client';

export type TrainingBatch = {
  id: string;
  courseId: string;
  startDate: string;
  endDate?: string | null;
  seats: number;
  seatsFilled: number;
  city?: string | null;
  state?: string | null;
  status: TrainingBatchStatus;
  notes?: string | null;
};

export type TrainingCourse = {
  id: string;
  organizationId: string;
  title: string;
  courseType: TrainingCourseType;
  mode: TrainingMode;
  description?: string | null;
  durationDays?: number | null;
  feeInr?: string | number | null;
  eligibility?: string | null;
  isPublished: boolean;
  batches: TrainingBatch[];
};

export type PublicTrainingCourse = TrainingCourse & {
  organization: {
    id: string;
    companyName: string;
    state?: string | null;
    city?: string | null;
    instituteProfile?: {
      accreditation?: string | null;
      rptoApprovalNo?: string | null;
      locations: string[];
    } | null;
  };
};

export type InstituteProfile = {
  accreditation?: string | null;
  rptoApprovalNo?: string | null;
  about?: string | null;
  locations: string[];
  scheduleNotes?: string | null;
};

export type CoursePayload = {
  title: string;
  courseType?: TrainingCourseType;
  mode?: TrainingMode;
  description?: string;
  durationDays?: number;
  feeInr?: number;
  eligibility?: string;
  isPublished?: boolean;
};

export type BatchPayload = {
  startDate: string;
  endDate?: string;
  seats: number;
  seatsFilled?: number;
  city?: string;
  state?: string;
  status?: TrainingBatchStatus;
  notes?: string;
};

export function listPublicCourses(params?: {
  type?: TrainingCourseType;
  mode?: TrainingMode;
  state?: string;
  q?: string;
}) {
  const s = new URLSearchParams();
  if (params?.type) s.set('type', params.type);
  if (params?.mode) s.set('mode', params.mode);
  if (params?.state) s.set('state', params.state);
  if (params?.q) s.set('q', params.q);
  const q = s.toString();
  return apiRequest<{ items: PublicTrainingCourse[]; total: number }>(
    `/training/courses${q ? `?${q}` : ''}`,
  );
}

export const getPublicCourse = (id: string) =>
  apiRequest<PublicTrainingCourse>(`/training/courses/${id}`);

export const submitCourseInterest = (
  courseId: string,
  body: {
    name: string;
    email: string;
    phone?: string;
    batchId?: string;
    message?: string;
  },
) =>
  apiRequest<{ id: string; routed: boolean }>(
    `/training/courses/${courseId}/interest`,
    { method: 'POST', body },
  );

export const getInstituteProfile = () =>
  apiRequest<InstituteProfile>('/partner/training/profile', { auth: true });

export const saveInstituteProfile = (body: Partial<InstituteProfile>) =>
  apiRequest<InstituteProfile>('/partner/training/profile', {
    method: 'PUT',
    auth: true,
    body,
  });

export const listOwnCourses = () =>
  apiRequest<{ items: TrainingCourse[] }>('/partner/training/courses', {
    auth: true,
  });

export const createCourse = (body: CoursePayload) =>
  apiRequest<TrainingCourse>('/partner/training/courses', {
    method: 'POST',
    auth: true,
    body,
  });

export const updateCourse = (id: string, body: Partial<CoursePayload>) =>
  apiRequest<TrainingCourse>(`/partner/training/courses/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const deleteCourse = (id: string) =>
  apiRequest<{ deleted: boolean }>(`/partner/training/courses/${id}`, {
    method: 'DELETE',
    auth: true,
  });

export const createBatch = (courseId: string, body: BatchPayload) =>
  apiRequest<TrainingBatch>(`/partner/training/courses/${courseId}/batches`, {
    method: 'POST',
    auth: true,
    body,
  });

export const updateBatch = (id: string, body: Partial<BatchPayload>) =>
  apiRequest<TrainingBatch>(`/partner/training/batches/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });

export const deleteBatch = (id: string) =>
  apiRequest<{ deleted: boolean }>(`/partner/training/batches/${id}`, {
    method: 'DELETE',
    auth: true,
  });

// --- student leads (institute inbox) ---------------------------------------

export type StudentLeadStatus = 'NEW' | 'CONTACTED' | 'ENROLLED' | 'CLOSED';

export type StudentLead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  message?: string | null;
  status: StudentLeadStatus;
  partnerNote?: string | null;
  createdAt: string;
  course: { id: string; title: string };
  batch?: { id: string; startDate: string; city?: string | null } | null;
};

export type StudentLeadsResponse = {
  items: StudentLead[];
  total: number;
  statusCounts: Record<StudentLeadStatus, number>;
};

export const STUDENT_LEAD_STATUS_LABELS: Record<StudentLeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  ENROLLED: 'Enrolled',
  CLOSED: 'Closed',
};

export const listStudentLeads = (status?: StudentLeadStatus) =>
  apiRequest<StudentLeadsResponse>(
    `/partner/training/leads${status ? `?status=${status}` : ''}`,
    { auth: true },
  );

export const updateStudentLead = (
  id: string,
  body: { status?: StudentLeadStatus; partnerNote?: string },
) =>
  apiRequest<StudentLead>(`/partner/training/leads/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
