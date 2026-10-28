'use client';

import Link from 'next/link';

const INDUSTRIES = [
  { name: 'Precision Agriculture', icon: '🌱', desc: '10L–30L crop spraying UAVs, multispectral yield estimation & FPO custom hiring.' },
  { name: 'Infrastructure & Highways', icon: '🛣️', desc: 'Corridor survey, bridge health monitoring, and National Highway NHAI construction progress.' },
  { name: 'Mining & Volumetric Analysis', icon: '⛏️', desc: 'Stockpile volumetric calculation, open-pit topographic scanning & safety compliance.' },
  { name: 'Defense & Homeland Security', icon: '🛡️', desc: 'Border surveillance, tactical thermal night reconnaissance, and anti-drone electronic warfare.' },
  { name: 'Power & Renewable Energy', icon: '⚡', desc: 'Solar string thermography, high-voltage transmission line stringing & wind turbine blade scans.' },
  { name: 'Cadastral Land Survey', icon: '🗺️', desc: 'SVAMITVA rural property mapping, state revenue boundary demarcations & GIS orthomosaics.' },
  { name: 'Logistics & Cargo Delivery', icon: '📦', desc: 'Beyond Visual Line of Sight (BVLOS) medical payload delivery and hilly terrain logistics.' },
  { name: 'Disaster & Emergency Response', icon: '🚨', desc: 'Flood relief situational awareness, search & rescue payload drops, and forest fire tracking.' },
];

export default function AboutUsPage() {
  return (
    <div className="platform-marketing-page">
      <section className="platform-marketing-hero">
        <div className="platform-marketing-hero__inner">
          <span className="platform-marketing-hero__eyebrow">OUR PURPOSE &amp; VISION</span>
          <h1 className="platform-marketing-hero__title">Connecting Global Drone Technology With India</h1>
          <p className="platform-marketing-hero__lead">
            GarudHub is India’s dedicated B2B drone ecosystem platform, empowering manufacturers, suppliers, pilot academies, and enterprise buyers to collaborate, trade, and build the future of Indian aviation.
          </p>
          <div className="platform-marketing-hero__actions">
            <Link href="/b2b-partners" className="platform-btn platform-btn-cta">
              Explore Partner Network
            </Link>
            <Link href="/services" className="platform-btn-hero-secondary">
              View 8 Core Services
            </Link>
          </div>
        </div>
      </section>

      <section className="platform-b2b-section">
        <div className="platform-marketing-story-grid">
          <div className="platform-card platform-marketing-card">
            <div className="platform-marketing-card__emoji platform-marketing-card__emoji--green" aria-hidden>
              📖
            </div>
            <h2 className="platform-marketing-card__title">Our Story</h2>
            <p className="platform-marketing-card__body">
              The Indian drone ecosystem is expanding at unprecedented velocity under the vision of <strong>Aatmanirbhar Bharat</strong> and progressive DGCA Drone Rules. However, enterprise buyers and government departments faced immense friction sourcing certified hardware, verifying vendor credentials, and securing long-term service support.
            </p>
            <p className="platform-marketing-card__body">
              GarudHub was founded to bridge this systemic divide. By centralizing verified drone manufacturers, RPTO pilot academies, authorized repair stations, and escrow-backed procurement, GarudHub serves as the trusted operating backbone of Indian drone commerce.
            </p>
          </div>

          <div className="platform-card platform-marketing-card">
            <div className="platform-marketing-card__emoji platform-marketing-card__emoji--blue" aria-hidden>
              🔭
            </div>
            <h2 className="platform-marketing-card__title">Our Vision &amp; Mission</h2>
            <div className="platform-marketing-vision-block">
              <strong>Vision:</strong>
              <p>
                Build India&apos;s most connected, transparent, and trusted B2B drone ecosystem platform, accelerating adoption across civil, defense, and agricultural sectors.
              </p>
            </div>
            <div>
              <strong>Mission:</strong>
              <ul className="platform-marketing-vision-list">
                <li>Enable global drone technologies to enter and manufacture locally in India.</li>
                <li>Empower Indian OEMs with structured enterprise RFQ opportunities and dealer networks.</li>
                <li>Guarantee technical compliance, DGCA validation, and milestone payment safety.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-card platform-ecosystem-banner">
        <span className="platform-ecosystem-banner__eyebrow">ARCHITECTURAL BLUEPRINT</span>
        <h2 className="platform-ecosystem-banner__title">The GarudHub Integrated Ecosystem Flow</h2>
        <p className="platform-ecosystem-banner__desc">
          A closed-loop commercial and operational network connecting upstream hardware makers with downstream operators and lifecycle support.
        </p>

        <div className="platform-ecosystem-flow">
          <div className="platform-ecosystem-node">
            <span className="platform-ecosystem-node__icon" aria-hidden>🏭</span>
            <strong>MANUFACTURER</strong>
            <span>OEMs &amp; Global Tech</span>
          </div>
          <span className="platform-ecosystem-arrow" aria-hidden>→</span>
          <div className="platform-ecosystem-node platform-ecosystem-node--hub">
            <span className="platform-ecosystem-node__icon platform-ecosystem-node__icon--hub" aria-hidden>🦅</span>
            <strong>GARUDHUB</strong>
            <span>Platform Core</span>
          </div>
          <span className="platform-ecosystem-arrow" aria-hidden>→</span>
          <div className="platform-ecosystem-node">
            <span className="platform-ecosystem-node__icon" aria-hidden>🚚</span>
            <strong>DISTRIBUTOR</strong>
            <span>State Allocation</span>
          </div>
          <span className="platform-ecosystem-arrow" aria-hidden>→</span>
          <div className="platform-ecosystem-node">
            <span className="platform-ecosystem-node__icon" aria-hidden>🏪</span>
            <strong>DEALER</strong>
            <span>Regional Hub</span>
          </div>
          <span className="platform-ecosystem-arrow" aria-hidden>→</span>
          <div className="platform-ecosystem-node">
            <span className="platform-ecosystem-node__icon" aria-hidden>🏢</span>
            <strong>BUYER</strong>
            <span>Govt / Enterprise</span>
          </div>
        </div>

        <div className="platform-ecosystem-loop">
          <div className="platform-ecosystem-loop__label">Continuous Lifecycle Support Loop</div>
          <div className="platform-ecosystem-loop__items">
            <span>🎓 Pilot Training (RPTO)</span>
            <span>•</span>
            <span>📋 DGCA Compliance &amp; UIN</span>
            <span>•</span>
            <span>🛠️ Authorized AMC Repair</span>
            <span>•</span>
            <span>♻️ E-Waste Buyback</span>
          </div>
        </div>
      </section>

      <section className="platform-b2b-section">
        <div className="platform-b2b-section__head">
          <h2 className="platform-b2b-section__title">Industries &amp; Verticals Powered by GarudHub</h2>
          <p className="platform-b2b-section__desc">
            Proven deployment footprints across critical infrastructure, national schemes, and private commercial enterprises.
          </p>
        </div>

        <div className="platform-industry-grid">
          {INDUSTRIES.map((ind) => (
            <div key={ind.name} className="platform-card platform-industry-card">
              <div className="platform-industry-card__icon" aria-hidden>
                {ind.icon}
              </div>
              <h3 className="platform-industry-card__title">{ind.name}</h3>
              <p className="platform-industry-card__desc">{ind.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-marketing-cta">
        <h2 className="platform-marketing-cta__title">Ready to Connect With the Indian Drone Ecosystem?</h2>
        <p className="platform-marketing-cta__desc">
          Register your business today to list products, quote on enterprise RFQs, or post technical drone procurement tenders.
        </p>
        <div className="platform-marketing-cta__actions">
          <Link href="/auth/register?type=partner" className="platform-btn platform-btn-cta">
            Register as B2B Partner
          </Link>
          <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-secondary">
            Post Drone RFP (Buyer)
          </Link>
        </div>
      </section>
    </div>
  );
}
