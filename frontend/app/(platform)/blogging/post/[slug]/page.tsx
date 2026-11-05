import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostView } from '@/components/blog/BlogViews';
import { getAllBlogPosts, getBlogPost } from '@/lib/content/blog';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Blog | GarudHub' };
  return {
    title: `${post.title} | GarudHub`,
    description: post.description ?? post.title,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  return <BlogPostView post={post} />;
}
