import '@/app/styles/platform.css';
import { AuthProvider } from '@/components/platform/AuthProvider';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingStyles } from '@/components/marketing/MarketingStyles';

export const metadata = {
  title: "GarudHub — India's B2B Drone Ecosystem Platform",
  description: "Connect Indian and international drone manufacturers, OEMs, distributors, dealers, and enterprises. Source certified UAVs, submit technical RFQs, and grow your drone business.",
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
