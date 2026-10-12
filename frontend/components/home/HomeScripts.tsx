'use client';

import { useEffect, useState } from 'react';
import { preparePageScript } from '@/lib/normalize-page-script';
import { loadScript } from '@/lib/load-script';

export function HomeScripts() {
  const [script, setScript] = useState('');

  useEffect(() => {
    fetch('/content/home-scripts.js')
      .then((r) => r.text())
      .then((text) => setScript(preparePageScript(text)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!script) return;
    void loadScript('https://unpkg.com/@phosphor-icons/web@2.1.1').then(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      try {
        // eslint-disable-next-line no-new-func
        new Function(script)();
      } catch (e) {
        console.error('[HomeScripts]', e);
      }
    });
  }, [script]);

  return null;
}
