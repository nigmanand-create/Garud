import { loadSnapshotHtml } from '@/lib/snapshot-html';

const MAIN_INNER_RE = /<main[^>]*id="main-content"[^>]*>([\s\S]*?)<\/main>/i;
const TITLE_RE = /<title>([^<]*)<\/title>/i;

/** Inner HTML of `#main-content` (legacy snapshot body without duplicate chrome). */
export function extractMainContentInner(html: string): string | null {
  const match = html.match(MAIN_INNER_RE);
  const inner = match?.[1]?.trim();
  return inner || null;
}

export function extractDocumentTitle(html: string): string | null {
  const match = html.match(TITLE_RE);
  const title = match?.[1]?.trim();
  return title || null;
}

export function loadSnapshotMainContent(pathname: string): string | null {
  const html = loadSnapshotHtml(pathname);
  if (!html) return null;
  return extractMainContentInner(html);
}

export function loadSnapshotDocumentTitle(pathname: string): string | null {
  const html = loadSnapshotHtml(pathname);
  if (!html) return null;
  return extractDocumentTitle(html);
}
