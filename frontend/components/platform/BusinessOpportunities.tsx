import Link from 'next/link';
import { BUSINESS_OPPORTUNITIES, RFQ_STEPS } from '@/lib/platform/business-opportunities';

/** Spec §1.4: B2B RFQ block ("What are you looking for?" + how it works). */
export function MarketplaceRfqBlock() {
  return (
    <section className="platform-marketplace-rfq" aria-labelledby="marketplace-rfq-title">
      <div className="platform-marketplace-rfq__head">
        <div>
          <p className="platform-marketplace-block-eyebrow">B2B RFQ</p>
          <h2 id="marketplace-rfq-title" className="platform-marketplace-block-title">
            What are you looking for?
          </h2>
          <p className="platform-muted">
            Can&apos;t find the exact spec? Post your requirement and verified vendors will send
            quotations you can compare side by side.
          </p>
        </div>
        <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-cta">
          Post your requirement
        </Link>
      </div>
      <ol className="platform-marketplace-rfq__steps" aria-label="How RFQ works">
        {RFQ_STEPS.map((step, i) => (
          <li key={step.label} className="platform-marketplace-rfq__step">
            <span className="platform-marketplace-rfq__num" aria-hidden>
              {i + 1}
            </span>
            <strong>{step.label}</strong>
            <span className="platform-muted platform-text-muted-sm">{step.description}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Spec §1.4: [DISTRIBUTOR] [DEALERSHIP] [PROJECTS] [PARTNERSHIPS]. */
export function BusinessOpportunitiesBlock() {
  return (
    <section
      className="platform-marketplace-opportunities"
      aria-labelledby="marketplace-opportunities-title"
    >
      <p className="platform-marketplace-block-eyebrow">Grow with GarudHub</p>
      <h2 id="marketplace-opportunities-title" className="platform-marketplace-block-title">
        Business opportunities
      </h2>
      <div className="platform-marketplace-opportunities__grid">
        {BUSINESS_OPPORTUNITIES.map((o) => (
          <article key={o.id} className="platform-marketplace-opportunity">
            <span className="platform-marketplace-opportunity__icon" aria-hidden>
              <i className={o.icon} />
            </span>
            <h3>{o.title}</h3>
            <p className="platform-muted platform-text-muted-sm">{o.description}</p>
            <Link href={o.href} className="platform-marketplace-opportunity__cta">
              {o.cta} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
