import { readContentFile } from '@/lib/read-content';
import { HtmlFragment } from '@/components/site/HtmlFragment';

export function HomeBody() {
  return <HtmlFragment html={readContentFile('home-body.html')} />;
}
