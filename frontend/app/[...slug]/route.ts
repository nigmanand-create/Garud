import { htmlResponse, loadSnapshotHtml } from '@/lib/snapshot-html';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const pathname = `/${slug.join('/')}`;
  const html = loadSnapshotHtml(pathname);
  if (!html) notFound();
  return htmlResponse(html);
}
