/**
 * Smoke-test snapshot routes (dev server must be running on PORT).
 * Bridged legacy slugs expect 307; blog/legal/platform-wrapped routes expect 200 HTML
 * without absolute garudhub.com URLs in href/src/content attributes.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const rawDir = join(root, 'content', 'raw');
const port = process.env.PORT || '3001';
const base = `http://localhost:${port}`;

/** Keep in sync with SNAPSHOT_REACT_BRIDGE keys in lib/snapshot-bridge.ts */
function bridgePathsFromSource() {
  const src = readFileSync(join(root, 'lib', 'snapshot-bridge.ts'), 'utf8');
  return new Set([...src.matchAll(/^\s+'(\/[^']+)':/gm)].map((m) => m[1]));
}

const bridgedPaths = bridgePathsFromSource();

function routesFromRaw() {
  const routes = new Set(['/']);
  for (const f of readdirSync(rawDir)) {
    if (!f.endsWith('.html')) continue;
    if (f === 'blogging.html') routes.add('/blogging');
    else if (f.startsWith('legal.php__page_'))
      routes.add('/legal.php/' + f.replace('legal.php__page_', '').replace('.html', ''));
    else if (f.startsWith('blogging__slug_'))
      routes.add('/blogging/post/' + f.replace('blogging__slug_', '').replace('.html', ''));
    else if (f.startsWith('blogging__category_'))
      routes.add('/blogging/category/' + f.replace('blogging__category_', '').replace('.html', ''));
    else routes.add('/' + f.replace('.html', ''));
  }
  return [...routes].sort();
}

const extra = [
  '/blogging?slug=10-things-to-know-before-buying-a-drone-in-india',
  '/blogging?category=drone-guides',
  '/legal.php?page=tos',
  '/legal.php?page=privacy',
  '/legal.php?page=refund',
  '/about.php',
  '/blog',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refund',
];

/** Absolute garudhub URLs in linkable attributes (ignore plain-text mentions in legal copy). */
const absAttrRe =
  /(?:href|src|content)=(["'])(?:https?:)?\/\/(?:www\.)?garudhub\.com[^"']*\1/gi;

function countAbsoluteGarudhubUrls(html) {
  return (html.match(absAttrRe) || []).length;
}

function routePathname(route) {
  return route.split('?')[0].replace(/\/+$/, '') || '/';
}

function expectsBridgeRedirect(route) {
  return bridgedPaths.has(routePathname(route));
}

function expectsPlatformShell(route) {
  const p = routePathname(route);
  return (
    p === '/blogging' ||
    p.startsWith('/blogging/post/') ||
    p.startsWith('/blogging/category/') ||
    p === '/legal/privacy' ||
    p === '/legal/terms' ||
    p === '/legal/refund'
  );
}

function expectsLegalLegacyRedirect(route) {
  const p = routePathname(route);
  return p.startsWith('/legal.php/') || /^\/legal\.php\?/.test(route);
}

let failed = 0;

for (const r of [...routesFromRaw(), ...extra]) {
  let res;
  try {
    res = await fetch(base + r, { redirect: 'manual' });
  } catch (e) {
    console.error('FAIL', r, e.message);
    failed++;
    continue;
  }

  const bridged = expectsBridgeRedirect(r);
  if (bridged) {
    if (res.status !== 307) {
      console.error('FAIL', r, 'expected 307 bridge redirect, got', res.status);
      failed++;
    }
    continue;
  }

  if (expectsLegalLegacyRedirect(r)) {
    if (res.status !== 308 && res.status !== 307) {
      console.error('FAIL', r, 'expected legal legacy redirect, got', res.status);
      failed++;
    }
    continue;
  }

  const text = await res.text();
  const abs = countAbsoluteGarudhubUrls(text);
  const ok = res.status === 200;
  if (!ok || abs > 0) {
    console.error('FAIL', r, 'status', res.status, 'garudhub attr refs', abs);
    failed++;
    continue;
  }

  if (expectsPlatformShell(r) && !text.includes('platform-marketing-root')) {
    console.error('FAIL', r, 'missing MarketingShell wrapper');
    failed++;
  }
}

if (!existsSync(join(root, 'public', 'index.html'))) {
  console.error('Missing public/index.html');
  failed++;
}

if (failed) {
  console.error(`\n${failed} check(s) failed. Is dev running? npm run dev`);
  process.exit(1);
}
console.log(`OK — ${routesFromRaw().length} snapshot routes + middleware smoke tests`);
