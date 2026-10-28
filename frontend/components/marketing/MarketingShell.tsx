'use client';

import Script from 'next/script';

const PHOSPHOR_ICONS = 'https://unpkg.com/@phosphor-icons/web@2.1.1';
import { DroneAssistantWidget } from '@/components/assistant/DroneAssistantWidget';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="platform-marketing-root page-platform">
      <a className="visually-hidden-focusable" href="#main-content">
        Skip to main content
      </a>
      <MarketingHeader />
      <main className="site-content platform-main" id="main-content" role="main">
        <div className="platform-content-inner">{children}</div>
      </main>
      <MarketingFooter />
      <DroneAssistantWidget />
      <Script src="/assets/js/header-desktop.js" strategy="afterInteractive" />
      <Script src="/assets/js/header-mobile.js" strategy="afterInteractive" />
      <Script src={PHOSPHOR_ICONS} strategy="lazyOnload" />
    </div>
  );
}
