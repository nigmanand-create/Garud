import { TrainingBatchStatus } from '@prisma/client';

/** Keep batch status consistent with seat counts (manual CLOSED / COMPLETED are respected). */
export function resolveBatchStatus(
  requested: TrainingBatchStatus | undefined,
  seats: number,
  seatsFilled: number,
): TrainingBatchStatus {
  if (
    requested === TrainingBatchStatus.CLOSED ||
    requested === TrainingBatchStatus.COMPLETED
  ) {
    return requested;
  }
  return seatsFilled >= seats
    ? TrainingBatchStatus.FULL
    : TrainingBatchStatus.OPEN;
}

export function formatInterestMessage(args: {
  courseTitle: string;
  batchLabel?: string | null;
  message?: string | null;
}): string {
  const lines = [
    `Interested in: ${args.courseTitle}`,
    args.batchLabel ? `Preferred batch: ${args.batchLabel}` : null,
    args.message?.trim() ? `\n${args.message.trim()}` : null,
  ].filter((l): l is string => Boolean(l));
  const text = lines.join('\n');
  // Enquiry.message requires >= 10 chars; the course line always satisfies that.
  return text.slice(0, 5000);
}
