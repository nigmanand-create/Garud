import matter from 'gray-matter';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const contentRoot = join(process.cwd(), 'content');

export type MarkdownDoc<T extends Record<string, unknown>> = {
  data: T;
  content: string;
};

export function readMarkdownDoc<T extends Record<string, unknown>>(
  relativePath: string,
): MarkdownDoc<T> | null {
  const filePath = join(contentRoot, relativePath);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { data: data as T, content: content.trim() };
}
