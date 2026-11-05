import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogCategoryView } from '@/components/blog/BlogViews';
import { getBlogCategories, getBlogPostsByCategory } from '@/lib/content/blog';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getBlogCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = getBlogCategories().find((c) => c.slug === slug);
  const label = cat?.label ?? slug;
  return {
    title: `${label} | GarudHub Blog`,
    description: `Articles about ${label} from GarudHub.`,
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = getBlogCategories().find((c) => c.slug === slug);
  if (!cat && getBlogPostsByCategory(slug).length === 0) notFound();
  return <BlogCategoryView categorySlug={slug} />;
}
