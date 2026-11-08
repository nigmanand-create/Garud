import Link from 'next/link';

import { StatStripReveal } from '@/components/marketing/StatStripReveal';

export type MarketingLandingHeroStat = {
  iconClass: string;
  bold: string;
  label: string;
};

export type MarketingLandingHeroTrust = {
  iconClass: string;
  label: string;
};

export type MarketingLandingHeroProps = {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Extra class on the root hero section (e.g. compact marketplace variant). */
  sectionClassName?: string;
  /** Extra class on the stat strip row below the hero. */
  statStripClassName?: string;
  /** When set, uses wireframe-style composition: product name, one headline, one line — image as dominant column. */
  brandName?: string;
  /** Defaults true; homepage sets false to keep the first viewport tight per wireframe. */
  showTrustChips?: boolean;
  /**
   * When false (default), hero photography uses a slow Ken Burns zoom. Set true on dense listing pages
   * to keep motion minimal next to other UI animations.
   */
  disableHeroImageMotion?: boolean;
  /** When false, brand-led layout skips staggered fade-in on copy (listing pages with other motion). */
  brandLedEntranceAnimation?: boolean;
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  trustChips: MarketingLandingHeroTrust[];
  statItems: MarketingLandingHeroStat[];
};

export function MarketingLandingHero({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  description,
  brandName,
  showTrustChips = true,
  disableHeroImageMotion = false,
  brandLedEntranceAnimation = true,
  sectionClassName,
  statStripClassName,
  primaryCta,
  secondaryCta,
  trustChips,
  statItems,
}: MarketingLandingHeroProps) {
  const isBrandLed = Boolean(brandName);
  const heroImgClass = `pg-hero-img${disableHeroImageMotion ? '' : ' pg-hero-img--kenburns'}`;
  const brandAnim = (i: 1 | 2 | 3 | 4) =>
    isBrandLed && brandLedEntranceAnimation ? ` pg-hero-animate pg-hero-animate--${i}` : '';

  return (
    <>
      <section
        className={`pg-hero platform-hero-fullbleed${isBrandLed ? ' pg-hero--brand-led' : ''}${sectionClassName ? ` ${sectionClassName}` : ''}`}
        aria-label="Page hero"
      >
        <div className={`wrap pg-hero-body${isBrandLed ? ' pg-hero-body--split' : ''}`}>
          {isBrandLed ? (
            <div className="pg-hero-grid">
              <div className="pg-hero-copy pg-hero-copy--brand">
                <span className="pg-hero-sr-only">{eyebrow}</span>
                <p className={`pg-hero-brand${brandAnim(1)}`}>{brandName}</p>
                <h1 className={brandAnim(2).trim() || undefined}>{title}</h1>
                <p className={`pg-hero-lead${brandAnim(3)}`}>{description}</p>
                <div className={`pg-hero-cta${brandAnim(4)}`}>
                  <Link href={primaryCta.href} className="pg-btn-solid">
                    {primaryCta.label}
                    <i className="ph ph-bold ph-arrow-right" aria-hidden="true" />
                  </Link>
                  {secondaryCta && (
                    <Link href={secondaryCta.href} className="pg-btn-ghost">
                      {secondaryCta.label}
                    </Link>
                  )}
                </div>
              </div>
              <div className="pg-hero-visual" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={heroImgClass}
                  src={imageSrc}
                  alt=""
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={heroImgClass}
                src={imageSrc}
                alt={imageAlt}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
              <div className="wrap pg-hero-body">
                <div className="pg-hero-copy">
                  <div className="pg-hero-eyebrow">
                    <span className="dot" aria-hidden="true" />
                    <span>{eyebrow}</span>
                  </div>
                  <h1>{title}</h1>
                  <p className="pg-hero-lead">{description}</p>
                  <div className="pg-hero-cta">
                    <Link href={primaryCta.href} className="pg-btn-solid">
                      {primaryCta.label}
                      <i className="ph ph-bold ph-arrow-right" aria-hidden="true" />
                    </Link>
                    {secondaryCta && (
                      <Link href={secondaryCta.href} className="pg-btn-ghost">
                        {secondaryCta.label}
                      </Link>
                    )}
                  </div>
                  {showTrustChips ? (
                    <div className="trust-row">
                      {trustChips.map((chip) => (
                        <span key={chip.label} className="trust-chip">
                          <i className={chip.iconClass} aria-hidden="true" />
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
        {isBrandLed && showTrustChips ? (
          <div className="wrap pg-hero-trust-fallback">
            <div className="trust-row">
              {trustChips.map((chip) => (
                <span key={chip.label} className="trust-chip">
                  <i className={chip.iconClass} aria-hidden="true" />
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <StatStripReveal>
        <div
          className={`stat-strip-row${statStripClassName ? ` ${statStripClassName}` : ''}`}
        >
          {statItems.map((item) => (
            <div key={item.label} className="stat-item">
              <i className={item.iconClass} aria-hidden="true" />
              <b>{item.bold}</b>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </StatStripReveal>
    </>
  );
}
