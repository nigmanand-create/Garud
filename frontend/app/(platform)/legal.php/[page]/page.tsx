import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SnapshotMainContent } from '@/components/marketing/SnapshotMainContent';
import {
  loadSnapshotDocumentTitle,
  loadSnapshotMainContent,
} from '@/lib/snapshot-main-content';

const LEGAL_FALLBACK_TITLES: Record<string, string> = {
  privacy: 'Privacy Policy | GarudHub',
  tos: 'Terms of Service | GarudHub',
  refund: 'Refund & Disclaimer | GarudHub',
};

type PageProps = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;
  const pathname = `/legal.php/${page}`;
  const fromDoc = loadSnapshotDocumentTitle(pathname);
  const title =
    fromDoc && fromDoc !== 'DroneHub'
      ? fromDoc
      : (LEGAL_FALLBACK_TITLES[page] ?? 'Legal | GarudHub');
  return { title };
}

export default async function LegalSnapshotPage({ params }: PageProps) {
  const { page } = await params;
  const pathname = `/legal.php/${page}`;
  const html = loadSnapshotMainContent(pathname);
  if (!html) notFound();
  return <SnapshotMainContent html={html} className={`page-legal page-legal-${page}`} />;
}
