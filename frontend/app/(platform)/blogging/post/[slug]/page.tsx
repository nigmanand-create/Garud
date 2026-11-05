import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SnapshotMainContent } from '@/components/marketing/SnapshotMainContent';
import {
  loadSnapshotDocumentTitle,
  loadSnapshotMainContent,
} from '@/lib/snapshot-main-content';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pathname = `/blogging/post/${slug}`;
  const title =
    loadSnapshotDocumentTitle(pathname) ?? `Blog | GarudHub`;
  return { title: title === 'DroneHub' ? 'Insights & Blog | GarudHub' : title };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const pathname = `/blogging/post/${slug}`;
  const html = loadSnapshotMainContent(pathname);
  if (!html) notFound();
  return <SnapshotMainContent html={html} className="page-blogging-post" />;
}
