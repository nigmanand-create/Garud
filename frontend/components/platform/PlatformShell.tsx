'use client';

import { usePathname } from 'next/navigation';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PartnerAppShell } from '@/components/platform/PartnerAppShell';
import { AdminAppShell } from '@/components/platform/AdminAppShell';

/** Routes partner/admin into focused app chrome vs marketing site. */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (pathname.startsWith('/partner')) {
    return <PartnerAppShell>{children}</PartnerAppShell>;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminAppShell>{children}</AdminAppShell>;
  }

  return <MarketingShell>{children}</MarketingShell>;
}
