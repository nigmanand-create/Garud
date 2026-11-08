import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingLandingHero } from '@/components/marketing/MarketingLandingHero';
import { HOME_CONTENT, HOME_HERO_IMAGE } from '@/lib/platform/home-content';

export const metadata: Metadata = {
  title: "GarudHub — India's B2B Drone Ecosystem Platform",
  description:
    'Connect Indian and international drone manufacturers, OEMs, distributors, dealers, service providers and enterprise buyers. Marketplace, RFQs, training, compliance and government opportunities.',
};

export default function HomePage() {
  const c = HOME_CONTENT;
  const { hero } = c;

  return (
    <div className="platform-home-page">
      <MarketingLandingHero
        imageSrc={HOME_HERO_IMAGE}
        imageAlt={hero.imageAlt}
        eyebrow={hero.eyebrow}
        brandName={hero.brandName}
        title={hero.title}
        description={hero.lead}
        showTrustChips={false}
        primaryCta={hero.primaryCta}
        secondaryCta={hero.secondaryCta}
        trustChips={[...hero.trustChips]}
        statItems={[...hero.statItems]}
      />

      <div className="platform-home-body platform-marketing-page platform-home">
        <section className="platform-b2b-section" aria-labelledby="home-who-we-are">
          <div className="platform-b2b-section__head">
            <h2 id="home-who-we-are" className="platform-b2b-section__title">
              Who we are
            </h2>
            <p className="platform-b2b-section__desc">{c.whoWeAre}</p>
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-ecosystem">
          <div className="platform-b2b-section__head">
            <h2 id="home-ecosystem" className="platform-b2b-section__title">
              Our ecosystem
            </h2>
            <p className="platform-b2b-section__desc">
              One trusted hub between drone makers and the people who buy, service and fly them.
            </p>
          </div>
          <div className="platform-card platform-home-flow platform-home-flow--graphic">
            <ol className="platform-home-flow__row" aria-label="Ecosystem flow">
              {c.ecosystemFlow.map((node, i) => (
                <li key={node} className="platform-home-flow__item">
                  <span
                    className={`platform-home-flow__node${node === 'GarudHub' ? ' platform-home-flow__node--hub' : ''}`}
                  >
                    {node}
                  </span>
                  {i < c.ecosystemFlow.length - 1 && (
                    <span className="platform-home-flow__arrow" aria-hidden>
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="platform-home-flow__under" aria-hidden>
              ↓
            </p>
            <ul
              className="platform-home-flow__row platform-home-flow__row--support"
              aria-label="Supporting services"
            >
              {c.ecosystemSupport.map((node) => (
                <li key={node} className="platform-home-flow__node platform-home-flow__node--support">
                  {node}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-services">
          <div className="platform-b2b-section__head">
            <h2 id="home-services" className="platform-b2b-section__title">
              Our services
            </h2>
            <p className="platform-b2b-section__desc">Eight services, one platform.</p>
          </div>
          <div className="platform-home-tiles">
            {c.services.map((s) => (
              <Link key={s.href} href={s.href} className="platform-card platform-home-tile">
                <i className={`bi ${s.icon} platform-home-tile__icon`} aria-hidden />
                <span className="platform-home-tile__num">{s.number}</span>
                <h3 className="platform-home-tile__title">{s.title}</h3>
                <p className="platform-muted platform-home-tile__desc">{s.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-who-can-join">
          <div className="platform-b2b-section__head">
            <h2 id="home-who-can-join" className="platform-b2b-section__title">
              Who can join GarudHub
            </h2>
            <p className="platform-b2b-section__desc">
              Partner accounts are verified by our team before they list on the marketplace.
            </p>
          </div>
          <div className="platform-home-tiles platform-home-tiles--compact">
            {c.whoCanJoin.map((w) => (
              <Link
                key={w.type}
                href={`/auth/register?type=${w.type}`}
                className="platform-card platform-home-tile platform-home-tile--compact"
              >
                <i className={`bi ${w.icon} platform-home-tile__icon`} aria-hidden />
                <h3 className="platform-home-tile__title">{w.label}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-why">
          <div className="platform-b2b-section__head">
            <h2 id="home-why" className="platform-b2b-section__title">
              Why GarudHub?
            </h2>
          </div>
          <div className="platform-b2b-pillar-grid">
            {c.why.map((w) => (
              <div key={w.title} className="platform-card platform-b2b-pillar-card">
                <div className="platform-b2b-pillar-icon platform-b2b-pillar-icon--green" aria-hidden>
                  ✓
                </div>
                <h3 className="platform-section-heading">{w.title}</h3>
                <p className="platform-muted">{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-how">
          <div className="platform-b2b-verify-banner">
            <h2 id="home-how" className="platform-b2b-verify-banner__title">
              How it works
            </h2>
            <p className="platform-b2b-verify-banner__desc">
              From registration to your first lead — verified end to end.
            </p>
            <ol className="platform-b2b-steps">
              {c.howItWorks.map((step, i) => (
                <li key={step} className="platform-home-step-item">
                  <span className={`platform-b2b-step${i === 0 ? ' platform-b2b-step--active' : ''}`}>
                    {step}
                  </span>
                  {i < c.howItWorks.length - 1 && (
                    <span className="platform-b2b-step-arrow" aria-hidden>
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="platform-b2b-section" aria-labelledby="home-industries">
          <div className="platform-b2b-section__head">
            <h2 id="home-industries" className="platform-b2b-section__title">
              Industries we serve
            </h2>
          </div>
          <ul className="platform-home-chips">
            {c.industries.map((industry) => (
              <li key={industry} className="platform-home-chip">
                {industry}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="platform-b2b-hero platform-home-final-cta platform-cta-dark-band"
          aria-label="Get started"
        >
          <div className="platform-b2b-hero__inner">
            <h2 className="platform-b2b-hero__title platform-home-final-cta__title">
              Ready to grow your drone business in India?
            </h2>
            <div className="platform-b2b-hero__actions">
              <Link href={hero.primaryCta.href} className="platform-btn platform-btn-cta">
                {hero.primaryCta.label}
              </Link>
              <Link href={hero.signInCta.href} className="platform-btn-hero-secondary">
                {hero.signInCta.label}
              </Link>
              <Link href={hero.secondaryCta.href} className="platform-btn-hero-secondary">
                {hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
