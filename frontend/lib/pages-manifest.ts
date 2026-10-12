import manifest from '@/content/pages/manifest.json';

export type PageManifest = Record<string, string>;

export const pagesManifest = manifest as PageManifest;

export function resolvePageDir(pathKey: string): string | undefined {
  return pagesManifest[pathKey];
}

export function pathFromSlugSegments(segments: string[]): string | null {
  if (segments.length === 0) return null;
  const joined = segments.join('/');

  if (pagesManifest[joined]) return joined;

  if (segments[0] === 'legal.php' && segments.length === 2) {
    const key = `legal.php?page=${segments[1]}`;
    if (pagesManifest[key]) return key;
  }

  if (segments[0] === 'blogging' && segments[1] === 'post' && segments[2]) {
    const key = `blogging?slug=${segments[2]}`;
    if (pagesManifest[key]) return key;
  }

  if (segments[0] === 'blogging' && segments[1] === 'category' && segments[2]) {
    const key = `blogging?category=${segments[2]}`;
    if (pagesManifest[key]) return key;
  }

  return null;
}
