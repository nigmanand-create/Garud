import { readMarkdownDoc } from '@/lib/content/markdown-doc';

export type LegalPageMeta = {
  title: string;
  slug: string;
  legacyPage?: string;
};

export type LegalPage = LegalPageMeta & { body: string };

const LEGAL_SLUGS = ['privacy', 'terms', 'refund'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function getLegalSlugs(): LegalSlug[] {
  return [...LEGAL_SLUGS];
}

export function getLegalPage(slug: string): LegalPage | null {
  if (!LEGAL_SLUGS.includes(slug as LegalSlug)) return null;
  const doc = readMarkdownDoc<LegalPageMeta>(`legal/${slug}.md`);
  if (!doc) return null;
  return {
    title: String(doc.data.title),
    slug: String(doc.data.slug ?? slug),
    legacyPage: doc.data.legacyPage ? String(doc.data.legacyPage) : undefined,
    body: doc.content,
  };
}
