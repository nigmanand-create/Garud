import Link from 'next/link';
import { MarkdownProse } from '@/components/content/MarkdownProse';
import type { LegalPage } from '@/lib/content/legal';

export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <div className={`legal-page-wrapper page-legal page-legal-${page.slug}`}>
      <div className="legal-page-container">
        <header className="legal-page-header">
          <h1 className="legal-page-title">{page.title}</h1>
        </header>
        <MarkdownProse markdown={page.body} className="platform-prose legal-page-content" />
        <div className="legal-page-back">
          <Link href="/">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
