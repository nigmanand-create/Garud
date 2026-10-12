import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const rawDir = join(root, 'content', 'raw');

const GARUDHUB_ORIGIN =
  /https?:\/\/(?:www\.)?garudhub\.com/gi;

/** Common UTF-8 mojibake on cloned pages (em dash, quotes, ellipsis). */
/** Point high-value marketing CTAs at the React platform (same origin). */
function bridgeMarketingToPlatform(html: string): string {
  let out = html;

  // Static clone marketplace pages → live B2B catalog UI
  out = out.replaceAll('href="/drone-marketplace"', 'href="/marketplace"');
  out = out.replaceAll('href="/drone-marketplace/"', 'href="/marketplace"');
  out = out.replaceAll(
    'href="/drone-accessories"',
    'href="/marketplace?section=accessories"',
  );
  out = out.replaceAll(
    'href="/drone-accessories/"',
    'href="/marketplace?section=accessories"',
  );

  // Partner onboarding (nav + cards); marketing copy pages remain reachable by direct URL
  out = out.replaceAll('href="/partner-with-us"', 'href="/auth/register"');
  out = out.replaceAll('href="/partner-with-us/"', 'href="/auth/register"');
  out = out.replaceAll('href="../Become-a-Partner/"', 'href="/auth/register"');
  out = out.replaceAll('href="Become-a-Partner/"', 'href="/auth/register"');
  out = out.replaceAll('href="/Become-a-Partner/"', 'href="/auth/register"');
  out = out.replaceAll('href="/become-a-partner/"', 'href="/auth/register"');

  return out;
}

function fixUtf8Mojibake(html: string): string {
  return html
    .replaceAll('â€"', '—')
    .replaceAll('â€™', "'")
    .replaceAll('â€˜', "'")
    .replaceAll('â€œ', '"')
    .replaceAll('â€\u009d', '"')
    .replaceAll('â€¦', '…');
}

export function localizeSnapshotHtml(html: string): string {
  let out = html
    .replaceAll('https://garudhub.com/assets/', '/assets/')
    .replaceAll('http://garudhub.com/assets/', '/assets/')
    .replaceAll('https://www.garudhub.com/assets/', '/assets/')
    .replaceAll('https://garudhub.com/api/', '/api/')
    .replaceAll('http://garudhub.com/api/', '/api/')
    .replaceAll('https://www.garudhub.com/api/', '/api/')
    .replaceAll('https://garudhub.com/', '/')
    .replaceAll('http://garudhub.com/', '/')
    .replaceAll('https://www.garudhub.com/', '/');

  // Catch any remaining absolute garudhub URLs (query strings, edge cases)
  out = out.replace(GARUDHUB_ORIGIN, '');

  // Live /about.php is 404; footer still links to it
  out = out.replaceAll('href="/about.php"', 'href="/about-us"');

  out = bridgeMarketingToPlatform(out);

  // Enquiry form: empty action → local POST proxy
  out = out.replace(
    /<form\s+method="post"\s+action=""\s+id="enquiry-form"/i,
    '<form method="post" action="/enquiry.php" id="enquiry-form"',
  );

  out = fixUtf8Mojibake(out);

  return out;
}

export function resolveSnapshotFile(pathname: string): string | null {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/') {
    return join(root, 'public', 'index.html');
  }

  if (path === '/blogging') {
    return join(rawDir, 'blogging.html');
  }

  const legal = path.match(/^\/legal\.php\/([^/]+)$/);
  if (legal) {
    return join(rawDir, `legal.php__page_${legal[1]}.html`);
  }

  const blogPost = path.match(/^\/blogging\/post\/(.+)$/);
  if (blogPost) {
    return join(rawDir, `blogging__slug_${blogPost[1]}.html`);
  }

  const blogCategory = path.match(/^\/blogging\/category\/(.+)$/);
  if (blogCategory) {
    return join(rawDir, `blogging__category_${blogCategory[1]}.html`);
  }

  const segment = path.replace(/^\//, '');
  const dotted = join(rawDir, `${segment}.html`);
  if (existsSync(dotted)) return dotted;

  return null;
}

export function loadSnapshotHtml(pathname: string): string | null {
  const file = resolveSnapshotFile(pathname);
  if (!file || !existsSync(file)) return null;
  return localizeSnapshotHtml(readFileSync(file, 'utf8'));
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
