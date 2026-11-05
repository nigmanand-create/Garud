import { notFound } from 'next/navigation';
import { SnapshotMainContent } from '@/components/marketing/SnapshotMainContent';
import { loadSnapshotMainContent } from '@/lib/snapshot-main-content';

export const metadata = {
  title: 'Insights & Blog | GarudHub',
  description:
    'Drone industry news, DGCA guides, training and careers, agriculture UAVs, and commercial drone insights from GarudHub.',
};

export default function BloggingIndexPage() {
  const html = loadSnapshotMainContent('/blogging');
  if (!html) notFound();
  return <SnapshotMainContent html={html} className="page-blogging" />;
}
