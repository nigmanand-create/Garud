import { readContentFile } from '@/lib/read-content';
import { HtmlFragment } from './HtmlFragment';

export function SiteSkipLink() {
  return <HtmlFragment html={readContentFile('skip-link.html')} />;
}
