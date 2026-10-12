import { htmlResponse, loadSnapshotHtml } from '@/lib/snapshot-html';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export function GET() {
  const html = loadSnapshotHtml('/');
  if (!html) notFound();
  return htmlResponse(html);
}
