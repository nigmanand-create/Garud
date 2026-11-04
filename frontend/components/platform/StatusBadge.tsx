import { formatEnumLabel } from '@/lib/platform/labels';

type StatusTone = 'neutral' | 'draft' | 'pending' | 'success' | 'danger' | 'info';

const TONE_MAP: Record<string, StatusTone> = {
  DRAFT: 'draft',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'pending',
  PENDING_REVIEW: 'pending',
  APPROVED: 'success',
  REJECTED: 'danger',
  UNPUBLISHED: 'neutral',
  OPEN: 'info',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  PUBLISHED: 'success',
  CONFIRMED: 'success',
  PENDING: 'pending',
  PROCESSING: 'info',
  SHIPPED: 'info',
  FULFILLED: 'success',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  ACCEPTED: 'success',
  WITHDRAWN: 'neutral',
  NEW: 'pending',
  READ: 'neutral',
  CONTACTED: 'info',
  QUALIFIED: 'info',
  WON: 'success',
  LOST: 'danger',
  DECLINED: 'danger',
  ACTIVE: 'success',
  PENDING_PAYMENT: 'pending',
  PAST_DUE: 'danger',
};

function toneForStatus(status: string): StatusTone {
  return TONE_MAP[status] ?? 'neutral';
}

type StatusBadgeProps = {
  status: string;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const tone = toneForStatus(status);
  const text = label ?? formatEnumLabel(status);
  return (
    <span className={`platform-status-badge platform-status-badge--${tone}`}>
      {text}
    </span>
  );
}
