import Link from 'next/link';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PlatformPageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  badge?: ReactNode;
};

export function PlatformPageHeader({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  backLabel = 'Back',
  actions,
  badge,
}: PlatformPageHeaderProps) {
  return (
    <header className="platform-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="platform-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`}>
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {backHref && !breadcrumbs?.length && (
        <Link href={backHref} className="platform-back-link">
          ← {backLabel}
        </Link>
      )}
      <div className="platform-page-header-row">
        <div className="platform-page-header-text">
          <div className="platform-page-header-title-row">
            <h1 className="platform-title">{title}</h1>
            {badge && (
              <div className="platform-page-header-badge">{badge}</div>
            )}
          </div>
          {subtitle && <p className="platform-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="platform-page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
