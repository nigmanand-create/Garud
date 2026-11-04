import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOME_CONTENT } from '../platform/home-content';
import { localizeSnapshotHtml } from '../snapshot-html';
import {
  injectSnapshotHeaderCtas,
  resolveSnapshotBridge,
  SNAPSHOT_REACT_BRIDGE,
} from '../snapshot-bridge';

describe('snapshot → React bridge (P-UI-12)', () => {
  it('maps top legacy slugs to React routes, with or without trailing slash', () => {
    expect(resolveSnapshotBridge('/partner-with-us/')).toEqual({ pathname: '/b2b-partners' });
    expect(resolveSnapshotBridge('/drone-training')).toEqual({ pathname: '/services', hash: '#training' });
    expect(resolveSnapshotBridge('/drone-accessories')?.search).toBe('?section=accessories');
    expect(resolveSnapshotBridge('/about-us')).toBeNull();
  });

  it('maps batch-2 legacy slugs (NEXT-U1)', () => {
    expect(resolveSnapshotBridge('/government-projects-schemes')).toEqual({
      pathname: '/services',
      hash: '#government',
    });
    expect(resolveSnapshotBridge('/scrap-recycling/')).toEqual({
      pathname: '/services',
      hash: '#recycling',
    });
    expect(resolveSnapshotBridge('/industries-we-serve')).toEqual({
      pathname: '/',
      hash: '#home-industries',
    });
    expect(resolveSnapshotBridge('/edp-professional-services')).toEqual({
      pathname: '/services',
      hash: '#professional',
    });
    expect(resolveSnapshotBridge('/india-market-entry')).toEqual({
      pathname: '/b2b-partners',
    });
  });

  it('keeps middleware matcher in sync with the bridge map', () => {
    const source = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    for (const path of Object.keys(SNAPSHOT_REACT_BRIDGE)) {
      expect(source).toContain(`'${path}'`);
      expect(source).toContain(`'${path}/'`);
    }
  });
});

describe('snapshot header CTAs (spec §1.2)', () => {
  const header =
    '<a href="/enquiry" class="header-cta header-cta-outline" style="x">Contact Us</a>' +
    '<a href="/enquiry" class="header-cta header-cta-outline" style="x">Contact Us</a>';

  it('injects LOGIN + REGISTER AS B2B PARTNER before each Contact Us CTA', () => {
    const out = injectSnapshotHeaderCtas(header);
    expect(out.match(/href="\/auth\/login"/g)).toHaveLength(2);
    expect(out.match(/href="\/auth\/register\?type=partner"/g)).toHaveLength(2);
    expect(injectSnapshotHeaderCtas(out)).toBe(out);
  });

  it('runs inside localizeSnapshotHtml for legacy enquiry.php links', () => {
    const out = localizeSnapshotHtml(
      '<a href="https://garudhub.com/enquiry.php" class="header-cta header-cta-outline">Contact</a>',
    );
    expect(out).toContain('href="/auth/login"');
    expect(out).toContain('href="/enquiry"');
  });
});

describe('React home content (C7)', () => {
  it('has the 8 service tiles and 8 join types from the spec', () => {
    expect(HOME_CONTENT.services).toHaveLength(8);
    expect(HOME_CONTENT.whoCanJoin).toHaveLength(8);
    expect(HOME_CONTENT.industries).toHaveLength(9);
  });

  it('only links to React routes (no legacy snapshot slugs)', () => {
    const hrefs = [
      HOME_CONTENT.hero.primaryCta.href,
      HOME_CONTENT.hero.secondaryCta.href,
      ...HOME_CONTENT.services.map((s) => s.href),
    ];
    for (const href of hrefs) {
      const path = href.split(/[?#]/)[0];
      expect(resolveSnapshotBridge(path)).toBeNull();
      expect(href.startsWith('/')).toBe(true);
    }
  });
});
