'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadScript } from '@/lib/load-script';
import { preparePageScript } from '@/lib/normalize-page-script';

const GLOBAL_EXTERNAL = new Set([
  'https://unpkg.com/@phosphor-icons/web@2.1.1',
  '/assets/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js',
  '/assets/js/main.js',
  '/assets/js/header-desktop.js',
  '/assets/js/header-mobile.js',
]);

type PageScriptRunnerProps = {
  pathKey: string;
  inlineScript?: string;
  externalSrcs?: string[];
};

function cleanupScrollTriggers() {
  const st = (window as Window & { ScrollTrigger?: { getAll: () => { kill: () => void }[] } })
    .ScrollTrigger;
  if (st?.getAll) {
    st.getAll().forEach((t) => t.kill());
  }
}

export function PageScriptRunner({
  pathKey,
  inlineScript,
  externalSrcs = [],
}: PageScriptRunnerProps) {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      cleanupScrollTriggers();

      const externals = externalSrcs.filter((src) => src && !GLOBAL_EXTERNAL.has(src));

      try {
        for (const src of externals) {
          if (cancelled) return;
          await loadScript(src);
        }

        if (cancelled || !inlineScript?.trim()) return;

        const prepared = preparePageScript(inlineScript);
        if (!prepared) return;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;

        // eslint-disable-next-line no-new-func
        new Function(prepared)();
      } catch (error) {
        console.error(`[PageScriptRunner] ${pathKey}`, error);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathKey, pathname, inlineScript, externalSrcs]);

  return null;
}
