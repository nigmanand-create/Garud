/** Pure helpers for the admin commerce analytics page (PRD Phase 6). */

export const ANALYTICS_RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

/** ₹1,23,456 below 1 lakh, then compact lakh / crore (Indian convention). */
export function formatInrCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (abs >= 1e5) return `₹${trim(n / 1e5)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function trim(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export type Delta = { text: string; tone: 'up' | 'down' | 'flat' | 'none' };

/** Period-over-period label; `null` means there was no baseline. */
export function formatDelta(changePct: number | null): Delta {
  if (changePct == null) return { text: 'no prior data', tone: 'none' };
  if (changePct === 0) return { text: '0% vs prev', tone: 'flat' };
  const sign = changePct > 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(changePct)}% vs prev`,
    tone: changePct > 0 ? 'up' : 'down',
  };
}

/** Bar heights (0–100) scaled to the largest value; all zeros stay at 0. */
export function barHeights(values: number[]): number[] {
  const max = Math.max(0, ...values);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => (v === 0 ? 0 : Math.max(Math.round((v / max) * 100), 3)));
}

export function formatTrendLabel(isoDate: string, bucketDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const s = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return bucketDays > 1 ? `Week of ${s}` : s;
}

export type FunnelStep = { key: string; label: string; count: number; ratePct: number };

/** Drop-off from each step to the next, for the funnel caption. */
export function funnelDropoffs(steps: FunnelStep[]): { from: string; to: string; lostPct: number }[] {
  const out: { from: string; to: string; lostPct: number }[] = [];
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].count;
    out.push({
      from: steps[i - 1].label,
      to: steps[i].label,
      lostPct: prev > 0 ? Math.round(((prev - steps[i].count) / prev) * 1000) / 10 : 0,
    });
  }
  return out;
}
