import { readFileSync } from 'fs';
import { join } from 'path';

const contentDir = join(process.cwd(), 'content');

export function readContentFile(name: string): string {
  return readFileSync(join(contentDir, name), 'utf8');
}
