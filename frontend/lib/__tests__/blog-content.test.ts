import { describe, expect, it } from 'vitest';
import { getAllBlogPosts, getBlogCategories, getBlogPost } from '@/lib/content/blog';
import { getLegalPage, getLegalSlugs } from '@/lib/content/legal';

describe('blog MDX content platform', () => {
  it('loads 12 posts and 11 categories from content/blog', () => {
    expect(getAllBlogPosts()).toHaveLength(12);
    expect(getBlogCategories()).toHaveLength(11);
  });

  it('uses real category labels from blog-categories.json', () => {
    const labels = getBlogCategories().map((c) => c.label);
    expect(labels).toContain('Drone Guides');
    expect(labels).toContain('Drone Recycling & Sustainability');
    expect(labels.every((l) => l !== 'DroneHub')).toBe(true);
  });

  it('resolves a known post by slug with body markdown', () => {
    const post = getBlogPost('10-things-to-know-before-buying-a-drone-in-india');
    expect(post?.title).toContain('10 Things');
    expect(post?.category).toBe('drone-guides');
    expect(post?.body.length).toBeGreaterThan(200);
  });
});

describe('legal markdown content', () => {
  it('loads three canonical legal pages', () => {
    expect(getLegalSlugs()).toEqual(['privacy', 'terms', 'refund']);
    for (const slug of getLegalSlugs()) {
      const page = getLegalPage(slug);
      expect(page?.body.length).toBeGreaterThan(100);
    }
  });
});
