'use client';

import { COMPARE_MAX } from '@/lib/platform/compare';
import { useCompare } from './useCompare';

type Props = { listingId: string; className?: string; label?: string };

export function CompareToggle({ listingId, className = '', label }: Props) {
  const { ids, toggle, isFull } = useCompare();
  const selected = ids.includes(listingId);
  const disabled = !selected && isFull;

  return (
    <button
      type="button"
      className={`platform-compare-toggle${selected ? ' platform-compare-toggle--active' : ''} ${className}`.trim()}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? `You can compare up to ${COMPARE_MAX} products` : undefined}
      onClick={() => toggle(listingId)}
    >
      <span aria-hidden>{selected ? '✓' : '⚖'}</span>{' '}
      {label ?? (selected ? 'Added to compare' : 'Compare')}
    </button>
  );
}
