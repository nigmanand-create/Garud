/**
 * Smoke-test marketing bridge redirects and React platform routes (dev server on PORT).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const port = process.env.PORT || '3001';
const base = `http://localhost:${port}`;

/** Keep in sync with SNAPSHOT_REACT_BRIDGE keys in lib/snapshot-bridge.ts */
function bridgePathsFromSource() {
  const src = readFileSync(join(root, 'lib', 'snapshot-bridge.ts'), 'utf8');
  return [...src.matchAll(/^\s+'(\/[^']+)':/gm)].map((m) => m[1]);
}

const bridgedPaths = new Set(bridgePathsFromSource());

const platformRoutes = [
  '/',
  '/marketplace',
  '/about-us',
  '/services',
  '/b2b-partners',
  '/enquiry',
  '/blogging',
  '/blogging/post/10-things-to-know-before-buying-a-drone-in-india',
  '/blogging/category/drone-guides',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refund',
  '/blogging?slug=10-things-to-know-before-buying-a-drone-in-india',
  '/blogging?category=drone-guides',
  '/legal.php?page=tos',
  '/legal.php?page=privacy',
  '/legal.php?page=refund',
  '/about.php',
  '/blog',
  '/legal.php/privacy',
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
const routes = [...new Set([...bridgedPaths, ...platformRoutes])].sort();

for (const r of routes) {
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
console.log(`OK — ${routes.length} bridge + platform route smoke tests`);
