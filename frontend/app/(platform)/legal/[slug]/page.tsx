import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPageView } from '@/components/legal/LegalPageView';
import { getLegalPage, getLegalSlugs } from '@/lib/content/legal';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getLegalSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) return { title: 'Legal | GarudHub' };
  return { title: `${page.title} | GarudHub` };
}

export default async function LegalContentPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) notFound();
  return <LegalPageView page={page} />;
}
