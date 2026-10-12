import '@/app/styles/platform.css';
import { AuthProvider } from '@/components/platform/AuthProvider';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingStyles } from '@/components/marketing/MarketingStyles';

export const metadata = {
  title: 'DroneHub',
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingStyles />
      <AuthProvider>
        <MarketingShell>{children}</MarketingShell>
      </AuthProvider>
    </>
  );
}
