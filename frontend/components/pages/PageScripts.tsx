'use client';

import Script from 'next/script';

const GLOBAL_EXTERNAL = new Set([
  'https://unpkg.com/@phosphor-icons/web@2.1.1',
  '/assets/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js',
  '/assets/js/main.js',
]);

type PageScriptsProps = {
  inlineScript?: string;
  externalSrcs?: string[];
};

export function PageScripts({ inlineScript, externalSrcs = [] }: PageScriptsProps) {
  const externals = externalSrcs.filter((src) => src && !GLOBAL_EXTERNAL.has(src));

  return (
    <>
      {externals.map((src) => (
        <Script key={src} src={src} strategy="afterInteractive" />
      ))}
      {inlineScript?.trim() ? (
        <Script id={`page-inline-${externals.length}`} strategy="afterInteractive">
          {inlineScript}
        </Script>
      ) : null}
    </>
  );
}
