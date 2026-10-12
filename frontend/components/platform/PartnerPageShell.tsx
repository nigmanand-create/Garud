'use client';

import type { ReactNode } from 'react';
import { PartnerSubnav } from '@/components/platform/PartnerSubnav';

type PartnerPageShellProps = {
  children: ReactNode;
};

/** Shared partner hub layout: subnav tabs + consistent vertical rhythm for page content. */
export function PartnerPageShell({ children }: PartnerPageShellProps) {
  return (
    <div className="platform-partner-page">
      <PartnerSubnav />
      <div className="platform-partner-page-body">{children}</div>
    </div>
  );
}
