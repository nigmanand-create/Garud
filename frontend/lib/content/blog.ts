import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const blogDir = join(process.cwd(), 'content', 'blog');
const categoriesPath = join(process.cwd(), 'content', 'blog-categories.json');

export type BlogPostMeta = {
  title: string;
  slug: string;
  date: string;
  category: string;
  categoryLabel: string;
  readTime?: string;
  heroImage?: string;
  description?: string;
};

export type BlogPost = BlogPostMeta & { body: string };

export type BlogCategory = { slug: string; label: string };

function categoryLabelBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of getBlogCategories()) {
    if (cat.label && cat.label !== 'DroneHub') map.set(cat.slug, cat.label);
  }
  return map;
}

function resolveCategoryLabel(categorySlug: string, fromFrontmatter: string): string {
  const mapped = categoryLabelBySlug().get(categorySlug);
  if (mapped) return mapped;
  if (fromFrontmatter && fromFrontmatter !== 'DroneHub') return fromFrontmatter;
  return fromFrontmatter || categorySlug;
}

function parsePostFile(filename: string): BlogPost | null {
  const raw = readFileSync(join(blogDir, filename), 'utf8');
  const { data, content } = matter(raw);
  const slug = String(data.slug ?? filename.replace(/\.md$/, ''));
  if (!data.title) return null;
  const category = String(data.category ?? '');
  const rawLabel = String(data.categoryLabel ?? data.category ?? '');
  return {
    title: String(data.title),
    slug,
    date: String(data.date ?? ''),
    category,
    categoryLabel: resolveCategoryLabel(category, rawLabel),
    readTime: data.readTime ? String(data.readTime) : undefined,
    heroImage: data.heroImage ? String(data.heroImage) : undefined,
    description: data.description ? String(data.description) : undefined,
    body: content.trim(),
  };
}

export function getBlogCategories(): BlogCategory[] {
  if (!existsSync(categoriesPath)) return [];
  return JSON.parse(readFileSync(categoriesPath, 'utf8')) as BlogCategory[];
}

export function getBlogCategory(slug: string): BlogCategory | null {
  return getBlogCategories().find((c) => c.slug === slug) ?? null;
}

export function getAllBlogPosts(): BlogPost[] {
  if (!existsSync(blogDir)) return [];
  const posts = readdirSync(blogDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parsePostFile(f))
    .filter((p): p is BlogPost => p !== null);
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getBlogPost(slug: string): BlogPost | null {
  const file = join(blogDir, `${slug}.md`);
  if (!existsSync(file)) return null;
  return parsePostFile(`${slug}.md`);
}

export function getBlogPostsByCategory(categorySlug: string): BlogPost[] {
  return getAllBlogPosts().filter((p) => p.category === categorySlug);
}

export function formatBlogDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
