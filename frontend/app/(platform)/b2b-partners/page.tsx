'use client';

import Link from 'next/link';

type PartnerModel = {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  badge: string;
  benefits: string[];
  idealFor: string;
  ctaText: string;
};

const PARTNERSHIP_MODELS: PartnerModel[] = [
  {
    id: 'manufacturers',
    title: 'Drone Manufacturers & OEMs',
    tagline: 'Scale sales across enterprise, agriculture, and government sectors with verified B2B buyers.',
    icon: 'bi-cpu-fill',
    badge: 'Hardware OEMs',
    benefits: [
      'Direct access to bulk enterprise and state government RFQs & tenders',
      'Dedicated product showcase with verified technical spec badges',
      'Nationwide distributor and dealership network matching',
      'Integrated DGCA Type Certification and subsidy compliance support',
    ],
    idealFor: 'Indian UAV manufacturers, payload designers & flight controller makers',
    ctaText: 'List as Manufacturer →',
  },
  {
    id: 'international',
    title: 'International Companies (India Market Entry)',
    tagline: 'Your trusted gateway to navigate Indian drone regulations, local manufacturing, and sales.',
    icon: 'bi-airplane-engines',
    badge: 'Global Brands',
    benefits: [
      'Seamless partnership with Indian manufacturing & assembly partners (Make in India)',
      'Regulatory compliance advisory: DGCA filings, WPC approvals, and BIS standards',
      'Appointment of verified master distributors and state-level dealers',
      'Protection of intellectual property and local entity setup consultancy',
    ],
    idealFor: 'Global drone tech firms, sensor & optical makers looking to enter India',
    ctaText: 'Explore India Entry →',
  },
  {
    id: 'dealers',
    title: 'Distributors & Regional Dealers',
    tagline: 'Expand your retail footprint with high-margin certified drones and spare parts.',
    icon: 'bi-shop-window',
    badge: 'Distribution',
    benefits: [
      'Direct wholesale dealership allocations from leading drone OEMs',
      'Guaranteed regional sales exclusivity and lead routing',
      'Inventory credit, demo units, and warranty fulfillment backing',
      'Fast-moving spare parts and battery replenishment pipeline',
    ],
    idealFor: 'Aviation distributors, agri-equipment dealers, and electronics retailers',
    ctaText: 'Apply for Dealership →',
  },
  {
    id: 'services',
    title: 'Service & Maintenance Providers',
    tagline: 'Join India’s largest drone maintenance and repair authorized service network.',
    icon: 'bi-tools',
    badge: 'Service Centers',
    benefits: [
      'Pre-qualified repair and AMC job leads in your operational territory',
      'Authorized OEM service center accreditation and technician certification',
      'Discounted genuine spare parts supply with fast dispatch',
      'Standardized service rate cards and guaranteed platform payout escrow',
    ],
    idealFor: 'Drone repair workshops, electronics service engineers & technicians',
    ctaText: 'Join Repair Network →',
  },
  {
    id: 'training',
    title: 'Training Institutes & Academies',
    tagline: 'Fill pilot training batches and place your certified students in enterprise jobs.',
    icon: 'bi-mortarboard',
    badge: 'RPTO Academies',
    benefits: [
      'Student lead generation from farmers, youth, and corporate enterprises',
      'Integration with Government skill missions and Namo Drone Didi programs',
      'Curriculum licensing and certified simulator training modules',
      'Job placement portal connecting alumni with commercial drone fleets',
    ],
    idealFor: 'DGCA-approved RPTOs, aviation academies & vocational colleges',
    ctaText: 'Partner Your Academy →',
  },
  {
    id: 'technology',
    title: 'Technology & Project Partners',
    tagline: 'Collaborate on large-scale government survey, mining, and smart agriculture tenders.',
    icon: 'bi-diagram-3-fill',
    badge: 'Turnkey Consortia',
    benefits: [
      'Joint bidding on Central & State Government GeM mega-tenders',
      'AI analytics, photogrammetry, and cloud software integration',
      'Shared flight crew, multi-sensor fleets, and ground station equipment',
      'End-to-end milestone management and institutional client escrow',
    ],
    idealFor: 'GIS mapping agencies, AI software startups, and survey contractors',
    ctaText: 'Collaborate on Projects →',
  },
];

export default function B2bPartnersPage() {
  return (
    <div className="platform-marketing-page">
      <section className="platform-b2b-hero">
        <div className="platform-b2b-hero__inner">
          <span className="platform-b2b-hero__eyebrow">PARTNER WITH GARUDHUB</span>
          <h1 className="platform-b2b-hero__title">Expand Your Drone Business Across India</h1>
          <p className="platform-b2b-hero__lead">
            Whether you manufacture certified UAVs, supply propulsion hardware, provide DGCA training, or offer regional repair — GarudHub connects you with active commercial demand.
          </p>
          <div className="platform-b2b-hero__actions">
            <Link href="/auth/register?type=partner" className="platform-btn platform-btn-cta">
              Register as B2B Partner →
            </Link>
            <Link href="/auth/login" className="platform-btn-hero-secondary">
              Partner Portal Login
            </Link>
          </div>
        </div>
      </section>

      <section className="platform-b2b-section">
        <div className="platform-b2b-section__head">
          <h2 className="platform-b2b-section__title">Why Top Drone Companies Choose GarudHub</h2>
          <p className="platform-b2b-section__desc">
            India&apos;s fastest growing B2B drone ecosystem connecting hardware, services, and regulatory capital.
          </p>
        </div>

        <div className="platform-b2b-pillar-grid">
          <div className="platform-card platform-b2b-pillar-card">
            <div className="platform-b2b-pillar-icon platform-b2b-pillar-icon--green" aria-hidden>📈</div>
            <h3 className="platform-section-heading">Direct Indian Market Access</h3>
            <p className="platform-muted">
              Instant distribution channels across 28 states, connecting international OEMs and domestic makers with vetted buyers.
            </p>
          </div>

          <div className="platform-card platform-b2b-pillar-card">
            <div className="platform-b2b-pillar-icon platform-b2b-pillar-icon--blue" aria-hidden>🎯</div>
            <h3 className="platform-section-heading">Pre-Qualified B2B RFP Leads</h3>
            <p className="platform-muted">
              No cold calling. Receive targeted RFQ invitations matching your exact payload, category, and regional radius.
            </p>
          </div>

          <div className="platform-card platform-b2b-pillar-card">
            <div className="platform-b2b-pillar-icon platform-b2b-pillar-icon--yellow" aria-hidden>🏛️</div>
            <h3 className="platform-section-heading">Government &amp; PSU Opportunities</h3>
            <p className="platform-muted">
              Consortium participation in state cadastral surveys, SVAMITVA, Kisan Drone schemes, and GeM procurement tenders.
            </p>
          </div>

          <div className="platform-card platform-b2b-pillar-card">
            <div className="platform-b2b-pillar-icon platform-b2b-pillar-icon--purple" aria-hidden>🛡️</div>
            <h3 className="platform-section-heading">Escrow &amp; Deal Protection</h3>
            <p className="platform-muted">
              Secured purchase orders, milestone payments, and prompt supplier payout releases with verified proof-of-delivery.
            </p>
          </div>
        </div>
      </section>

      <section className="platform-b2b-section">
        <div className="platform-b2b-section__head">
          <h2 className="platform-b2b-section__title">Partnership Models &amp; Collaboration Tracks</h2>
          <p className="platform-b2b-section__desc">
            Select your organization type to discover how you can grow within the GarudHub network.
          </p>
        </div>

        <div className="platform-b2b-models-grid">
          {PARTNERSHIP_MODELS.map((m) => (
            <div key={m.id} id={m.id} className="platform-card platform-b2b-model-card">
              <div>
                <div className="platform-b2b-model-card__head">
                  <div className="platform-b2b-model-icon" aria-hidden>
                    <i className={`bi ${m.icon}`} />
                  </div>
                  <span className="platform-b2b-model-badge">{m.badge}</span>
                </div>

                <h3 className="platform-b2b-model-title">{m.title}</h3>
                <p className="platform-b2b-model-tagline">{m.tagline}</p>

                <div>
                  <div className="platform-b2b-benefits-label">Key Partner Benefits</div>
                  <ul className="platform-b2b-benefits-list">
                    {m.benefits.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="platform-b2b-ideal-for">
                  <strong>Ideal for:</strong> {m.idealFor}
                </div>
              </div>

              <Link
                href="/auth/register?type=partner"
                className="platform-btn platform-btn-cta platform-btn-full"
              >
                {m.ctaText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-b2b-verify-banner">
        <h2 className="platform-b2b-verify-banner__title">Strict Verification Standards for Enterprise Trust</h2>
        <p className="platform-b2b-verify-banner__desc">
          All GarudHub B2B partners undergo GST, CIN, DGCA compliance, and technical verification prior to dashboard activation to ensure authentic commercial transactions.
        </p>

        <div className="platform-b2b-steps">
          <div className="platform-b2b-step">1. Submit Application</div>
          <span className="platform-b2b-step-arrow" aria-hidden>→</span>
          <div className="platform-b2b-step">2. Business Verification</div>
          <span className="platform-b2b-step-arrow" aria-hidden>→</span>
          <div className="platform-b2b-step">3. Admin Approval</div>
          <span className="platform-b2b-step-arrow" aria-hidden>→</span>
          <div className="platform-b2b-step platform-b2b-step--active">4. Active Dashboard</div>
        </div>

        <Link href="/auth/register?type=partner" className="platform-btn platform-btn-cta">
          Begin Partner Registration
        </Link>
      </section>
    </div>
  );
}
