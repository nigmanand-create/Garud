'use client';

import type { ReactNode } from 'react';

type PartnerPageShellProps = {
  children: ReactNode;
};

/** Partner hub page content (nav lives in PartnerAppShell sidebar). */
export function PartnerPageShell({ children }: PartnerPageShellProps) {
  return <div className="platform-partner-page-body">{children}</div>;
}
