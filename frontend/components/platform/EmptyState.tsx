import Link from 'next/link';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="platform-empty-state">
      {icon && <div className="platform-empty-state-icon" aria-hidden>{icon}</div>}
      <h3 className="platform-empty-state-title">{title}</h3>
      <p className="platform-empty-state-desc">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="platform-empty-state-actions">
          {primaryAction && (
            <Link href={primaryAction.href} className="platform-btn platform-btn-cta">
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="platform-btn platform-btn-secondary"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
