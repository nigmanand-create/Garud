/**
 * Smoke-test every snapshot route (dev server must be running on PORT).
 * Exits 1 if any route is non-200 or still contains absolute garudhub URLs.
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const rawDir = join(root, 'content', 'raw');
const port = process.env.PORT || '3001';
const base = `http://localhost:${port}`;

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
  '/about.php',
];

const absRe = /https?:\/\/(?:www\.)?garudhub\.com/i;
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
  const text = await res.text();
  const abs = (text.match(absRe) || []).length;
  const redirect307 = new Set(['/about.php', '/drone-accessories', '/drone-marketplace']);
  const ok = res.status === 200 || (redirect307.has(r) && res.status === 307);
  if (!ok || abs > 0) {
    console.error('FAIL', r, 'status', res.status, 'garudhub refs', abs);
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
