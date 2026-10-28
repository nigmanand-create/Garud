'use client';

import Link from 'next/link';
import { useState } from 'react';

type ServiceItem = {
  id: string;
  number: string;
  title: string;
  tagline: string;
  icon: string;
  badge: string;
  offerings: string[];
  applications: string[];
  primaryCta: { label: string; href: string };
  isMarketplace?: boolean;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'marketplace',
    number: '01',
    title: 'Drone Marketplace',
    tagline: 'Source verified UAVs, enterprise payloads, and precision components pan-India.',
    icon: 'bi-shop',
    badge: 'Hardware & Tech',
    offerings: [
      'DGCA Type-Certified Agriculture Drones (10L–30L sprayers)',
      'High-precision LiDAR, Photogrammetry & Survey Rigs',
      'Industrial Enterprise UAVs (Thermal, Zoom & Night Inspection)',
      'Motors, ESCs, Flight Controllers & Propulsion Payloads',
      'Batteries, High-rate Chargers & Ground Control Stations',
    ],
    applications: ['Precision Agriculture', 'Land Surveying', 'Defense & Security', 'Infrastructure Inspection'],
    primaryCta: { label: 'Explore Marketplace →', href: '/marketplace' },
    isMarketplace: true,
  },
  {
    id: 'training',
    number: '02',
    title: 'Drone Training & Licensing',
    tagline: 'DGCA-certified Remote Pilot Training Organizations (RPTO) & technician academies.',
    icon: 'bi-mortarboard-fill',
    badge: 'DGCA Certified',
    offerings: [
      'DGCA Remote Pilot Certificate (RPC) courses for Small & Medium drones',
      'Drone Technician, Assembly & Maintenance Certification',
      'Specialized Agri-Spraying & Thermal Inspection Flying Masterclasses',
      'Nationwide RPTO Institute Network Enrollment',
      'Corporate Drone Pilot Fleet Onboarding',
    ],
    applications: ['Youth Skill Development', 'Government Kamyabi Schemes', 'Commercial Flying', 'Enterprise Teams'],
    primaryCta: { label: 'Enquire for Training Batches →', href: '/enquiry.php?service=training' },
  },
  {
    id: 'compliance',
    number: '03',
    title: 'DGCA & Regulatory Compliance',
    tagline: 'End-to-end regulatory advisory, UIN generation, and Type Certification filings.',
    icon: 'bi-shield-check',
    badge: 'Govt Compliant',
    offerings: [
      'Unique Identification Number (UIN) registration support',
      'DGCA Type Certification document preparation for OEMs',
      'Digital Sky platform integration & flight permissions',
      'Import Clearance & Quality Standard verification',
      'Aviation regulatory consultancy for defense & civil operations',
    ],
    applications: ['Drone Manufacturers', 'Importers', 'Commercial Operators', 'Govt Vendors'],
    primaryCta: { label: 'Get Compliance Assistance →', href: '/enquiry.php?service=compliance' },
  },
  {
    id: 'repair',
    number: '04',
    title: 'Repair, AMC & Maintenance',
    tagline: 'Authorized service centers, genuine spare parts, and Annual Maintenance Contracts.',
    icon: 'bi-tools',
    badge: 'Nationwide Network',
    offerings: [
      'Crash damage repair & structural carbon fiber restoration',
      'Annual Maintenance Contracts (AMC) with periodic tune-ups',
      'Propeller balancing, motor calibration & gimbal sensor alignment',
      'Genuine OEM spare parts procurement with warranty',
      'Doorstep pickup, inspection, and return dispatch across India',
    ],
    applications: ['Fleet Operators', 'Agri-Entrepreneurs', 'Survey Firms', 'Security Agencies'],
    primaryCta: { label: 'Book Drone Repair / AMC →', href: '/enquiry.php?service=repair' },
  },
  {
    id: 'professional',
    number: '05',
    title: 'Professional Drone Services',
    tagline: 'Turnkey aerial survey, multispectral crop analytics, and engineering data collection.',
    icon: 'bi-briefcase-fill',
    badge: 'Enterprise Grade',
    offerings: [
      'Large-scale cadastral land survey & orthomosaic GIS mapping',
      'Agriculture spraying & multispectral NDVI crop health monitoring',
      'Solar farm, pipeline, and highway thermal inspection',
      'Mining volumetric analysis & stockpile 3D measurement',
      'Full technical data processing & CAD-ready deliverables',
    ],
    applications: ['State Revenue Depts', 'Mining Companies', 'Renewable Energy', 'Agri Corporates'],
    primaryCta: { label: 'Request Enterprise Project →', href: '/buyer/rfqs/new' },
  },
  {
    id: 'finance',
    number: '06',
    title: 'Drone Finance & Insurance',
    tagline: 'Hassle-free loan assistance, low-interest EMIs, and comprehensive hull insurance.',
    icon: 'bi-cash-coin',
    badge: 'Subsidies & Loans',
    offerings: [
      'Agriculture Drone financing under SMAM & AIF Government Subsidies',
      'Easy EMI schemes with partner banks and NBFCs',
      'Third-party liability & comprehensive hull insurance coverage',
      'Equipment leasing solutions for commercial drone startups',
      'Fast loan eligibility check and minimal documentation',
    ],
    applications: ['Farmers & FPOs', 'CHCs (Custom Hiring Centers)', 'Drone Pilots', 'Commercial Startups'],
    primaryCta: { label: 'Apply for Drone Loan / Insurance →', href: '/enquiry.php?service=finance' },
  },
  {
    id: 'government',
    number: '07',
    title: 'Government Projects & Schemes',
    tagline: 'Bidding support for GeM tenders, SVAMITVA scheme deployment, and PSU projects.',
    icon: 'bi-building-fill',
    badge: 'GeM & Tenders',
    offerings: [
      'Consortium bidding assistance for Central & State drone tenders',
      'Subsidized procurement schemes (Kisan Drone, Namo Drone Didi)',
      'GeM (Government e-Marketplace) listing & OEM catalog integration',
      'Large-scale rural survey & mapping project execution',
      'Defense & Homeland Security procurement advisory',
    ],
    applications: ['Govt Departments', 'PSUs', 'State Agencies', 'Drone Didi SHGs'],
    primaryCta: { label: 'Post Tender / RFP →', href: '/buyer/rfqs/new' },
  },
  {
    id: 'recycling',
    number: '08',
    title: 'Scrap, Buyback & Recycling',
    tagline: 'Eco-friendly disposal of decommissioned drones, battery buybacks, and salvage.',
    icon: 'bi-recycle',
    badge: 'Circular Economy',
    offerings: [
      'Fair valuation of aged, broken, or obsolete commercial drones',
      'Guaranteed buyback programs when upgrading to newer models',
      'Responsible LiPo / Li-ion battery recycling adhering to E-waste norms',
      'Salvage of reusable carbon frames, ESCs, and optical components',
      'Certified green disposal certificates for enterprise ESG compliance',
    ],
    applications: ['Fleet Modernization', 'Corporate ESG', 'Research Labs', 'Drone Operators'],
    primaryCta: { label: 'Get Drone Scrap Valuation →', href: '/enquiry.php?service=recycling' },
  },
];

export default function DroneServicesPage() {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filtered = activeFilter === 'all'
    ? SERVICES
    : SERVICES.filter((s) => s.id === activeFilter);

  return (
    <div className="platform-marketing-page">
      <section className="platform-marketing-hero platform-marketing-hero--compact">
        <div className="platform-marketing-hero__inner platform-marketing-hero__inner--narrow">
          <span className="platform-marketing-hero__eyebrow">GARUDHUB ECOSYSTEM BLUEPRINT</span>
          <h1 className="platform-marketing-hero__title platform-marketing-hero__title--services">
            Complete Drone Services Under One Platform
          </h1>
          <p className="platform-marketing-hero__lead platform-marketing-hero__lead--services">
            From purchasing certified UAVs and pilot training to DGCA compliance, nationwide repair, finance, and enterprise project execution.
          </p>
          <div className="platform-marketing-hero__actions">
            <Link href="/buyer/rfqs/new" className="platform-btn platform-btn-cta">
              Post Your Requirement (RFP)
            </Link>
            <Link href="/auth/register?type=partner" className="platform-btn-hero-secondary">
              Join Service Provider Network
            </Link>
          </div>
        </div>
      </section>

      <section className="platform-card platform-card--lg platform-b2b-section">
        <div className="platform-b2b-section__head">
          <h2 className="platform-section-heading">How Service Delivery Works on GarudHub</h2>
          <p className="platform-b2b-section__desc">
            Structured 4-step workflow connecting requirements with verified service partners.
          </p>
        </div>
        <div className="platform-steps-grid">
          <div className="platform-step-card">
            <div className="platform-step-num platform-step-num--green">1</div>
            <strong>Submit Requirement</strong>
            <p>Select a service, specify technical parameters, location, and timeline.</p>
          </div>
          <div className="platform-step-card">
            <div className="platform-step-num platform-step-num--blue">2</div>
            <strong>Match &amp; Verify</strong>
            <p>GarudHub matches your scope with verified DGCA/certified regional partners.</p>
          </div>
          <div className="platform-step-card">
            <div className="platform-step-num platform-step-num--amber">3</div>
            <strong>Compare &amp; Connect</strong>
            <p>Receive structured quotations, technical feasibility, and schedule execution.</p>
          </div>
          <div className="platform-step-card">
            <div className="platform-step-num platform-step-num--purple">4</div>
            <strong>Fulfillment &amp; Support</strong>
            <p>Execution with quality oversight, compliance signoff, and milestone guarantee.</p>
          </div>
        </div>
      </section>

      <div className="platform-filter-chip-bar" role="tablist" aria-label="Filter services">
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'all'}
          className={`platform-filter-chip ${activeFilter === 'all' ? 'platform-filter-chip--active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All 8 Services
        </button>
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === s.id}
            className={`platform-filter-chip ${activeFilter === s.id ? 'platform-filter-chip--active' : ''}`}
            onClick={() => setActiveFilter(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="platform-services-grid">
        {filtered.map((s) => (
          <div key={s.id} id={s.id} className="platform-card platform-service-card">
            <div>
              <div className="platform-service-card__head">
                <span className="platform-service-card__number">{s.number}</span>
                <span className="platform-service-card__badge">{s.badge}</span>
              </div>

              <div className="platform-service-card__title-row">
                <i className={`bi ${s.icon}`} aria-hidden />
                <h3 className="platform-service-card__title">{s.title}</h3>
              </div>

              <p className="platform-service-card__tagline">{s.tagline}</p>

              <div className="platform-service-card__section-label">Key Capabilities</div>
              <ul className="platform-service-card__list">
                {s.offerings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="platform-service-card__section-label platform-service-card__section-label--apps">
                Industry Applications
              </div>
              <div className="platform-service-card__apps">
                {s.applications.map((app) => (
                  <span key={app} className="platform-service-card__app-tag">
                    {app}
                  </span>
                ))}
              </div>
            </div>

            <Link href={s.primaryCta.href} className="platform-btn platform-btn-cta platform-btn-full">
              {s.primaryCta.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
