import { readContentFile } from '@/lib/read-content';
import { HtmlFragment } from './HtmlFragment';

export function SiteFooter() {
  return <HtmlFragment html={readContentFile('site-footer.html')} />;
}
