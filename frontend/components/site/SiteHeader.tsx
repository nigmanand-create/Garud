import { readContentFile } from '@/lib/read-content';
import { HtmlFragment } from './HtmlFragment';

export function SiteHeader() {
  return <HtmlFragment html={readContentFile('site-header.html')} />;
}
