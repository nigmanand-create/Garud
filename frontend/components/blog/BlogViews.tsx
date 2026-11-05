import Link from 'next/link';
import {
  formatBlogDate,
  getAllBlogPosts,
  getBlogCategories,
  getBlogCategory,
  getBlogPostsByCategory,
  type BlogPost,
} from '@/lib/content/blog';
import { MarkdownProse } from '@/components/content/MarkdownProse';

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blogging/post/${post.slug}`} className="blog-card">
      {post.heroImage ? (
        <div className="blog-card-img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="blog-card-img" src={post.heroImage} alt="" />
        </div>
      ) : (
        <div className="blog-card-img-wrap blog-card-img-ph">
          <span aria-hidden>✦</span>
        </div>
      )}
      <div className="blog-card-date">{formatBlogDate(post.date)}</div>
      <span className="blog-cat-badge">{post.categoryLabel}</span>
      <h3>{post.title}</h3>
      {post.description ? <p>{post.description}</p> : null}
      {post.readTime ? (
        <div className="blog-card-meta">
          <span>{post.readTime}</span>
        </div>
      ) : null}
    </Link>
  );
}

function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  const categories = getBlogCategories();
  return (
    <nav className="blog-cats" aria-label="Blog categories">
      <Link href="/blogging" className={!activeSlug ? 'active' : undefined}>
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`/blogging/category/${cat.slug}`}
          className={activeSlug === cat.slug ? 'active' : undefined}
        >
          {cat.label}
        </Link>
      ))}
    </nav>
  );
}

export function BlogIndexView() {
  const posts = getAllBlogPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="blog-wrap page-blogging">
      <header className="blog-header">
        <div>
          <h1 className="blog-h1">GarudHub Blog</h1>
          <p className="blog-sub">
            Drone industry news, DGCA guides, training, agriculture UAVs, and commercial insights
            from GarudHub.
          </p>
        </div>
      </header>

      <CategoryNav />

      {featured ? (
        <Link href={`/blogging/post/${featured.slug}`} className="blog-feature">
          {featured.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="blog-feature-img" src={featured.heroImage} alt="" />
          ) : (
            <div className="blog-feature-img blog-card-img-ph" aria-hidden />
          )}
          <div>
            <div className="blog-feature-eyebrow">Featured</div>
            <h2>{featured.title}</h2>
            {featured.description ? <p>{featured.description}</p> : null}
            <div className="blog-meta">
              <span>{formatBlogDate(featured.date)}</span>
              {featured.readTime ? <span>{featured.readTime}</span> : null}
            </div>
          </div>
        </Link>
      ) : null}

      {featured && rest.length > 0 ? <hr className="blog-divider" /> : null}

      <div className="blog-grid">
        {(featured ? rest : posts).map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}

export function BlogCategoryView({ categorySlug }: { categorySlug: string }) {
  const posts = getBlogPostsByCategory(categorySlug);
  const categoryLabel =
    getBlogCategory(categorySlug)?.label ?? posts[0]?.categoryLabel ?? categorySlug;

  return (
    <div className="blog-wrap page-blogging-category">
      <header className="blog-header">
        <div>
          <h1 className="blog-h1">{categoryLabel}</h1>
          <p className="blog-sub">
            Articles in {categoryLabel}.{' '}
            <Link href="/blogging">View all posts</Link>
          </p>
        </div>
      </header>

      <CategoryNav activeSlug={categorySlug} />

      {posts.length === 0 ? (
        <div className="blog-empty">
          <p>No posts in this category yet.</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogPostView({ post }: { post: BlogPost }) {
  return (
    <article className="blog-post-wrap page-blogging-post">
      <Link className="blog-back" href="/blogging">
        ← Back to Blog
      </Link>

      <header className="blog-post-header">
        <Link className="blog-post-cat" href={`/blogging/category/${post.category}`}>
          {post.categoryLabel}
        </Link>
        <h1 className="blog-post-h1">{post.title}</h1>
        <div className="blog-byline">
          <span className="blog-byline-name">GarudHub</span>
          <span className="dot">·</span>
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          {post.readTime ? (
            <>
              <span className="dot">·</span>
              <span>{post.readTime}</span>
            </>
          ) : null}
        </div>
      </header>

      {post.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="blog-hero-img" src={post.heroImage} alt="" />
      ) : null}

      <MarkdownProse markdown={post.body} className="platform-prose blog-content" />

      <footer className="blog-post-footer">
        <Link className="blog-back" href="/blogging">
          ← Back to Blog
        </Link>
      </footer>
    </article>
  );
}
