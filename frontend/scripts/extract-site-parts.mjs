import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, 'public', 'index.html');
const outDir = join(root, 'content');
mkdirSync(outDir, { recursive: true });

const html = readFileSync(source, 'utf8');

function localize(s) {
  return s
    .replaceAll('https://garudhub.com/assets/', '/assets/')
    .replaceAll('https://garudhub.com/', '/');
}

const skipLink = html.match(
  /<a class="visually-hidden-focusable"[\s\S]*?<\/a>/,
)?.[0];
const headerBlock = html.match(
  /<!-- New Header System -->[\s\S]*?<script src="[^"]*header-mobile\.js" defer><\/script>/,
)?.[0];
const mainBlock = html.match(/<main class="site-content"[\s\S]*?<\/main>/)?.[0];
const nestedStyle = mainBlock?.match(/<style>[\s\S]*?<\/style>/)?.[0];
const nestedBody = mainBlock?.match(
  /<body>\s*([\s\S]*?)<script>\s*document\.addEventListener\('DOMContentLoaded'/,
)?.[1];
const homeScripts = mainBlock?.match(
  /<script>\s*document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>\s*<\/body>/,
)?.[0];
const footerBlock = html.match(
  /<style>\/\*\*\s*\n \* C-type Footer[\s\S]*?<\/footer>/,
)?.[0];

if (!skipLink || !headerBlock || !nestedStyle || !nestedBody || !homeScripts || !footerBlock) {
  console.error('Failed to extract one or more sections. Check index.html structure.');
  process.exit(1);
}

writeFileSync(join(outDir, 'skip-link.html'), localize(skipLink));
const headerHtml = localize(headerBlock).replace(
  /\s*<script src="[^"]*header-(?:desktop|mobile)\.js" defer><\/script>/g,
  '',
);
writeFileSync(join(outDir, 'site-header.html'), headerHtml);
writeFileSync(join(outDir, 'home-styles.css'), nestedStyle.replace(/^<style>|<\/style>$/g, ''));
writeFileSync(join(outDir, 'home-body.html'), localize(nestedBody.trim()));
writeFileSync(
  join(outDir, 'home-scripts.js'),
  homeScripts
    .replace(/^<script>|<\/script>\s*<\/body>$/g, '')
    .trim(),
);
writeFileSync(
  join(outDir, 'site-footer.html'),
  localize(footerBlock.replace(/^<style>[\s\S]*?<\/style>/, '')),
);
writeFileSync(
  join(outDir, 'site-footer.css'),
  footerBlock.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '',
);

console.log('Extracted site parts into content/');
