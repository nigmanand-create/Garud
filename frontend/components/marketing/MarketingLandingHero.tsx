import Link from 'next/link';

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
  primaryCta,
  secondaryCta,
  trustChips,
  statItems,
}: MarketingLandingHeroProps) {
  return (
    <>
      <section className="pg-hero platform-hero-fullbleed" aria-label="Page hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pg-hero-img"
          src={imageSrc}
          alt={imageAlt}
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
        <div className="wrap pg-hero-body">
          <div className="pg-hero-eyebrow">
            <span className="dot" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
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
          <div className="trust-row">
            {trustChips.map((chip) => (
              <span key={chip.label} className="trust-chip">
                <i className={chip.iconClass} aria-hidden="true" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="fw stat-strip platform-hero-fullbleed">
        <div className="stat-strip-row">
          {statItems.map((item) => (
            <div key={item.label} className="stat-item">
              <i className={item.iconClass} aria-hidden="true" />
              <b>{item.bold}</b>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
