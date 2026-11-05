/**
 * One-time / repeatable migration: snapshot HTML → markdown in content/blog + content/legal.
 * Run: node scripts/migrate-blog-legal-content.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const rawDir = join(root, 'content', 'raw');
const blogDir = join(root, 'content', 'blog');
const legalDir = join(root, 'content', 'legal');
const categoriesFile = join(root, 'content', 'blog-categories.json');

function decodeEntities(s) {
  return s
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·');
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function htmlToMarkdown(html) {
  let out = html.trim();
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n\n## ${stripTags(t)}\n\n`);
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n### ${stripTags(t)}\n\n`);
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n\n#### ${stripTags(t)}\n\n`);
  out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${stripTags(t)}**`);
  out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, t) => `**${stripTags(t)}**`);
  out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, t) => `*${stripTags(t)}*`);
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripTags(t)}\n`);
  out = out.replace(/<\/?ul[^>]*>/gi, '\n');
  out = out.replace(/<\/?ol[^>]*>/gi, '\n');
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => {
    const line = stripTags(t);
    return line ? `\n\n${line}\n` : '\n';
  });
  out = out.replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => {
    const text = stripTags(t);
    if (!text) return '';
    const local = href.replace(/https?:\/\/(?:www\.)?garudhub\.com/i, '');
    return `[${text}](${local || href})`;
  });
  out = out.replace(/<[^>]+>/g, '');
  out = decodeEntities(out);
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function extractMainInner(html) {
  const m = html.match(/<main[^>]*id="main-content"[^>]*>([\s\S]*?)<\/main>/i);
  return m?.[1] ?? '';
}

function parseBlogPost(file, slug) {
  const html = readFileSync(join(rawDir, file), 'utf8');
  const inner = extractMainInner(html);
  const titleM = inner.match(/<h1 class="tblog-post-h1">([\s\S]*?)<\/h1>/i);
  const title = titleM ? stripTags(titleM[1]) : slug;
  const catM = inner.match(/class="tblog-post-cat"[^>]*>([\s\S]*?)<\/a>/i);
  const categorySlugM = inner.match(/blogging\?category=([^"'&]+)/);
  const categorySlug = categorySlugM?.[1] ?? '';
  const categoryLabel = catM ? stripTags(catM[1]) : categorySlug;
  const dateM = inner.match(/tblog-byline[\s\S]*?<span>([A-Za-z]{3}\s+\d{1,2},\s+\d{4})<\/span>/);
  const readM = inner.match(/(\d+\s+min read)/);
  const heroM = inner.match(/<img class="tblog-hero-img" src="([^"]+)"/);
  const contentM = inner.match(/<div class="tblog-content">([\s\S]*?)<\/div>/i);
  const body = contentM ? htmlToMarkdown(contentM[1]) : '';
  const excerpt = body.split('\n').find((l) => l.trim().length > 40)?.trim().slice(0, 200) ?? '';

  const dateRaw = dateM?.[1] ?? 'Jan 1, 2026';
  const parsed = new Date(dateRaw);
  const date = Number.isNaN(parsed.getTime()) ? '2026-01-01' : parsed.toISOString().slice(0, 10);

  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `slug: ${JSON.stringify(slug)}`,
    `date: ${date}`,
    `category: ${JSON.stringify(categorySlug)}`,
    `categoryLabel: ${JSON.stringify(categoryLabel)}`,
    readM ? `readTime: ${JSON.stringify(readM[1])}` : null,
    heroM ? `heroImage: ${JSON.stringify(heroM[1])}` : null,
    excerpt ? `description: ${JSON.stringify(excerpt)}` : null,
    '---',
    '',
    body,
    '',
  ]
    .filter(Boolean)
    .join('\n');

  writeFileSync(join(blogDir, `${slug}.md`), fm, 'utf8');
  return { slug, title, categorySlug, categoryLabel, date, excerpt };
}

function parseCategoriesFromIndex() {
  const html = readFileSync(join(rawDir, 'blogging.html'), 'utf8');
  const inner = extractMainInner(html);
  const cats = [];
  for (const m of inner.matchAll(/blogging\?category=([^"'&]+)[^>]*>\s*([^<]+)/g)) {
    const slug = m[1];
    const label = stripTags(m[2]);
    if (!cats.some((c) => c.slug === slug)) cats.push({ slug, label });
  }
  return cats;
}

function parseCategoryPage(file, slug) {
  const html = readFileSync(join(rawDir, file), 'utf8');
  const inner = extractMainInner(html);
  const h1M = inner.match(/<h1 class="tblog-h1">([\s\S]*?)<\/h1>/);
  const label = h1M ? stripTags(h1M[1]).replace(/\s*Blog\s*$/i, '').trim() : slug;
  return { slug, label: label || slug };
}

function parseLegal(page, outSlug) {
  const file = `legal.php__page_${page}.html`;
  const html = readFileSync(join(rawDir, file), 'utf8');
  const inner = extractMainInner(html);
  const titleM = inner.match(/<h1 class="legal-page-title">([\s\S]*?)<\/h1>/);
  const title = titleM ? stripTags(titleM[1]) : outSlug;
  const contentM = inner.match(/<div class="legal-page-content">([\s\S]*?)<\/div>/i);
  const body = contentM ? htmlToMarkdown(contentM[1]) : htmlToMarkdown(inner);

  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `slug: ${JSON.stringify(outSlug)}`,
    `legacyPage: ${JSON.stringify(page)}`,
    '---',
    '',
    body,
    '',
  ].join('\n');

  writeFileSync(join(legalDir, `${outSlug}.md`), fm, 'utf8');
  return { slug: outSlug, title };
}

mkdirSync(blogDir, { recursive: true });
mkdirSync(legalDir, { recursive: true });

const posts = [];
for (const f of readdirSync(rawDir)) {
  if (!f.startsWith('blogging__slug_') || !f.endsWith('.html')) continue;
  const slug = f.replace('blogging__slug_', '').replace('.html', '');
  posts.push(parseBlogPost(f, slug));
}

let categories = parseCategoriesFromIndex();
for (const f of readdirSync(rawDir)) {
  if (!f.startsWith('blogging__category_') || !f.endsWith('.html')) continue;
  const slug = f.replace('blogging__category_', '').replace('.html', '');
  const cat = parseCategoryPage(f, slug);
  const idx = categories.findIndex((c) => c.slug === slug);
  if (idx >= 0) categories[idx] = { ...categories[idx], label: cat.label };
  else categories.push(cat);
}

writeFileSync(categoriesFile, JSON.stringify(categories, null, 2) + '\n', 'utf8');

const legal = [
  parseLegal('privacy', 'privacy'),
  parseLegal('tos', 'terms'),
  parseLegal('refund', 'refund'),
];

console.log(
  JSON.stringify(
    {
      posts: posts.length,
      categories: categories.length,
      legal: legal.length,
      blogDir,
      legalDir,
    },
    null,
    2,
  ),
);
