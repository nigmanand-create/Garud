import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pagesDir = join(root, 'content', 'pages');
const rawDir = join(root, 'content', 'raw');

/** Navigation order: home snapshot is public/index.html, served by app/route.ts */
export const PAGE_PATHS = [
  'about-us',
  'industries-we-serve',
  'dgca-compliance',
  'drone-training',
  'repairs-maintenance',
  'finance-insurance',
  'edp-professional-services',
  'scrap-recycling',
  'drone-jobs-career',
  'government-projects-schemes',
  'drone-marketplace',
  'drone-accessories',
  'india-market-entry',
  'market-entry-consultancy',
  'business-setup-in-india',
  'drone-operations-setup',
  'manufacturing-technology-collaboration',
  'partner-with-us',
  'blogging',
  'enquiry.php',
  'loan-calculators.php',
  'about.php',
  'legal.php?page=tos',
  'legal.php?page=privacy',
  'legal.php?page=refund',
];

function localize(s) {
  return s
    .replaceAll('https://garudhub.com/assets/', '/assets/')
    .replaceAll('https://garudhub.com/api/', '/api/')
    .replaceAll('https://garudhub.com/', '/');
}

function wrapScriptReady(js) {
  if (!js.trim()) return '';
  if (js.includes('runWhenReady') || js.includes('document.readyState')) return js;
  return `(function runWhenReady() {
  function init() {
${js}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}

function extractPage(html) {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? 'DroneHub';
  const bodyClass = html.match(/<body class="([^"]*)"/i)?.[1] ?? '';

  const mainMatch = html.match(/<main class="site-content"[\s\S]*?<\/main>/i);
  if (!mainMatch) {
    throw new Error('Missing <main class="site-content">');
  }

  let mainInner = mainMatch[0]
    .replace(/^<main[^>]*>/i, '')
    .replace(/<\/main>$/i, '')
    .trim();

  const styles = [];
  const externalScripts = new Set();
  let bodyHtml = mainInner;

  const nestedDoc = mainInner.match(/<!DOCTYPE html>[\s\S]*/i);
  if (nestedDoc) {
    const nested = nestedDoc[0];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let sm;
    while ((sm = styleRegex.exec(nested)) !== null) {
      styles.push(sm[1].trim());
    }

    const collectScripts = (chunk) => {
      const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = scriptRegex.exec(chunk)) !== null) {
        const attrs = m[1] ?? '';
        const src = attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1];
        if (src) {
          if (!src.includes('@phosphor-icons')) externalScripts.add(src);
        }
      }
    };

    const headChunk = nested.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    collectScripts(headChunk);

    const bodyChunk = nested.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[0] ?? '';
    bodyHtml = bodyChunk.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';

    const inlineScripts = [];
    const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(bodyChunk)) !== null) {
      const attrs = m[1] ?? '';
      const src = attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1];
      if (src) {
        if (!src.includes('@phosphor-icons')) externalScripts.add(src);
      } else {
        const content = m[2].trim();
        if (content) inlineScripts.push(content);
      }
    }

    return {
      title,
      bodyClass,
      bodyHtml: localize(bodyHtml.trim()),
      styles: styles.join('\n\n'),
      scripts: wrapScriptReady(inlineScripts.join('\n\n')),
      externalScripts: [...externalScripts].map((s) => localize(s)),
    };
  }

  // Plain main content (forms, calculators, etc.)
  const inlineScripts = [];
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  const scriptsInMain = [...mainInner.matchAll(scriptRegex)];
  for (const match of scriptsInMain) {
    const attrs = match[1] ?? '';
    const src = attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    if (src) {
      if (!src.includes('@phosphor-icons')) externalScripts.add(src);
    } else {
      const content = match[2].trim();
      if (content) inlineScripts.push(content);
    }
  }
  bodyHtml = mainInner.replace(scriptRegex, '').trim();

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm;
  while ((sm = styleRegex.exec(mainInner)) !== null) {
    styles.push(sm[1].trim());
  }
  bodyHtml = bodyHtml.replace(styleRegex, '').trim();

  return {
    title,
    bodyClass,
    bodyHtml: localize(bodyHtml),
    styles: styles.join('\n\n'),
    scripts: wrapScriptReady(inlineScripts.join('\n\n')),
    externalScripts: [...externalScripts].map((s) => localize(s)),
  };
}

function slugToDir(slug) {
  return slug.replace(/\?/g, '__').replace(/=/g, '_');
}

function fetchHtml(path) {
  const url = `https://garudhub.com/${path}`;
  return execSync(`curl -fsSL "${url}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function discoverBlogPaths(bloggingHtml) {
  const extra = [];
  const slugs = new Set();
  const categories = new Set();
  for (const m of bloggingHtml.matchAll(/blogging\?slug=([^"'&]+)/g)) slugs.add(m[1]);
  for (const m of bloggingHtml.matchAll(/blogging\?category=([^"'&]+)/g)) categories.add(m[1]);
  for (const slug of slugs) extra.push(`blogging?slug=${slug}`);
  for (const category of categories) extra.push(`blogging?category=${category}`);
  return extra;
}

mkdirSync(pagesDir, { recursive: true });
mkdirSync(rawDir, { recursive: true });

const manifest = {};
const pathsToClone = [...PAGE_PATHS];

for (const path of pathsToClone) {
  const dirName = slugToDir(path);
  const out = join(pagesDir, dirName);
  mkdirSync(out, { recursive: true });

  console.log(`Cloning /${path} ...`);
  let html;
  try {
    html = fetchHtml(path);
  } catch (e) {
    console.error(`  FAILED fetch: ${path}`, e.message);
    continue;
  }

  writeFileSync(join(rawDir, `${dirName}.html`), html);

  try {
    const extracted = extractPage(html);
    writeFileSync(join(out, 'body.html'), extracted.bodyHtml);
    writeFileSync(join(out, 'styles.css'), extracted.styles);
    writeFileSync(join(out, 'scripts.js'), extracted.scripts);
    writeFileSync(
      join(out, 'meta.json'),
      JSON.stringify(
        {
          path,
          title: extracted.title,
          bodyClass: extracted.bodyClass,
          externalScripts: extracted.externalScripts,
        },
        null,
        2,
      ),
    );
    manifest[path] = dirName;
    console.log(`  OK (${extracted.title})`);

    if (path === 'blogging') {
      const blogExtras = discoverBlogPaths(html);
      for (const blogPath of blogExtras) {
        if (pathsToClone.includes(blogPath)) continue;
        pathsToClone.push(blogPath);
      }
    }
  } catch (e) {
    console.error(`  FAILED extract: ${path}`, e.message);
  }
}

// Second pass: blog posts/categories discovered from index
for (const path of pathsToClone) {
  if (manifest[path]) continue;
  const dirName = slugToDir(path);
  const out = join(pagesDir, dirName);
  mkdirSync(out, { recursive: true });
  console.log(`Cloning /${path} ...`);
  let html;
  try {
    html = fetchHtml(path);
  } catch (e) {
    console.error(`  FAILED fetch: ${path}`, e.message);
    continue;
  }
  writeFileSync(join(rawDir, `${dirName}.html`), html);
  try {
    const extracted = extractPage(html);
    writeFileSync(join(out, 'body.html'), extracted.bodyHtml);
    writeFileSync(join(out, 'styles.css'), extracted.styles);
    writeFileSync(join(out, 'scripts.js'), extracted.scripts);
    writeFileSync(
      join(out, 'meta.json'),
      JSON.stringify(
        {
          path,
          title: extracted.title,
          bodyClass: extracted.bodyClass,
          externalScripts: extracted.externalScripts,
        },
        null,
        2,
      ),
    );
    manifest[path] = dirName;
    console.log(`  OK (${extracted.title})`);
  } catch (e) {
    console.error(`  FAILED extract: ${path}`, e.message);
  }
}

writeFileSync(join(pagesDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Done. ${Object.keys(manifest).length} pages in manifest.`);
