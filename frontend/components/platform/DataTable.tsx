import type { ReactNode } from 'react';
import { PlatformLoading } from '@/components/platform/PlatformLoading';

export type DataTableProps = {
  children: ReactNode;
  /** Extra classes on the outer wrapper (often `platform-card`). */
  className?: string;
  tableClassName?: string;
  wrapClassName?: string;
  empty?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  'aria-label'?: string;
};

/** `platform-table-wrap` + `platform-table` with optional loading / empty slots. */
export function DataTable({
  children,
  className,
  tableClassName = 'platform-table',
  wrapClassName,
  empty,
  loading,
  loadingLabel = 'Loading…',
  'aria-label': ariaLabel,
}: DataTableProps) {
  if (loading) {
    return (
      <div className={className}>
        <PlatformLoading label={loadingLabel} />
      </div>
    );
  }

  if (empty) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={className}>
      <div className={`platform-table-wrap ${wrapClassName ?? ''}`.trim()}>
        <table className={tableClassName} aria-label={ariaLabel}>
          {children}
        </table>
      </div>
    </div>
  );
}
