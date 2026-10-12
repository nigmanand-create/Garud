'use client';

import Script from 'next/script';

export function SiteScripts() {
  return (
    <>
      <Script src="/assets/js/header-desktop.js" strategy="afterInteractive" />
      <Script src="/assets/js/header-mobile.js" strategy="afterInteractive" />
      <Script src="https://unpkg.com/@phosphor-icons/web@2.1.1" strategy="afterInteractive" />
      <Script src="/assets/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js" strategy="afterInteractive" />
      <Script src="/assets/js/main.js" strategy="afterInteractive" />
      <Script id="aos-init" strategy="afterInteractive">
        {`document.addEventListener('DOMContentLoaded', function() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true, offset: 100 });
  }
});`}
      </Script>
    </>
  );
}
