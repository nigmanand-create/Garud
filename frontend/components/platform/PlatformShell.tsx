'use client';

import { usePathname } from 'next/navigation';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { PartnerAppShell } from '@/components/platform/PartnerAppShell';
import { AdminAppShell } from '@/components/platform/AdminAppShell';
import { GovernmentAppShell } from '@/components/platform/GovernmentAppShell';
import { useAuth } from '@/components/platform/AuthProvider';

/** Routes partner/admin into focused app chrome vs marketing site. */
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();

  const governmentHubShell =
    user?.role === 'GOVERNMENT' &&
    (pathname === '/government' || pathname.startsWith('/government/'));

  if (pathname.startsWith('/partner')) {
    return <PartnerAppShell>{children}</PartnerAppShell>;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminAppShell>{children}</AdminAppShell>;
  }

  if (governmentHubShell) {
    return <GovernmentAppShell>{children}</GovernmentAppShell>;
  }

  return <MarketingShell>{children}</MarketingShell>;
}
