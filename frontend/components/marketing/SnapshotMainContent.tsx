import { HtmlFragment } from '@/components/site/HtmlFragment';

type SnapshotMainContentProps = {
  html: string;
  className?: string;
};

/** Localized legacy snapshot body rendered inside platform `MarketingShell`. */
export function SnapshotMainContent({ html, className }: SnapshotMainContentProps) {
  return (
    <HtmlFragment
      html={html}
      className={className ? `snapshot-main-content ${className}` : 'snapshot-main-content'}
    />
  );
}
