import Link from 'next/link';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LOGO_URL,
} from '@/components/marketing/marketing-site';

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        borderTop: '1px solid #1e293b',
        paddingTop: '3.5rem',
        paddingBottom: '2rem',
        fontSize: '0.875rem',
      }}
    >
      <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Col 1: Brand & Positioning */}
          <div style={{ maxWidth: '300px' }}>
            <Link href="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
              <img src={LOGO_URL} alt="GarudHub" style={{ height: 48, filter: 'brightness(0) invert(1)' }} />
            </Link>
            <p style={{ color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 1rem', fontSize: '0.875rem' }}>
              <strong>GarudHub — India&apos;s B2B Drone Ecosystem Platform.</strong> Connecting global drone technology with India&apos;s manufacturers, distributors, dealers, and enterprise buyers.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#1e293b', color: '#4ade80', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                ✓ DGCA Ecosystem
              </span>
              <span style={{ background: '#1e293b', color: '#38bdf8', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                ✓ Verified B2B Partners
              </span>
            </div>
          </div>

          {/* Col 2: 8 Ecosystem Services */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              8 Drone Services
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
              <li><Link href="/services#marketplace" style={{ color: '#94a3b8', textDecoration: 'none' }}>01. Drone Marketplace</Link></li>
              <li><Link href="/services#training" style={{ color: '#94a3b8', textDecoration: 'none' }}>02. Drone Pilot &amp; Tech Training</Link></li>
              <li><Link href="/services#compliance" style={{ color: '#94a3b8', textDecoration: 'none' }}>03. DGCA &amp; Compliance</Link></li>
              <li><Link href="/services#repair" style={{ color: '#94a3b8', textDecoration: 'none' }}>04. Repair &amp; AMC Maintenance</Link></li>
              <li><Link href="/services#professional" style={{ color: '#94a3b8', textDecoration: 'none' }}>05. Professional Survey &amp; Mapping</Link></li>
              <li><Link href="/services#finance" style={{ color: '#94a3b8', textDecoration: 'none' }}>06. Drone Finance &amp; Insurance</Link></li>
              <li><Link href="/services#government" style={{ color: '#94a3b8', textDecoration: 'none' }}>07. Government Tenders &amp; Projects</Link></li>
              <li><Link href="/services#recycling" style={{ color: '#94a3b8', textDecoration: 'none' }}>08. Scrap &amp; Recycling</Link></li>
            </ul>
          </div>

          {/* Col 3: B2B Partners */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              B2B Partner Network
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
              <li><Link href="/b2b-partners#manufacturers" style={{ color: '#94a3b8', textDecoration: 'none' }}>Drone Manufacturers &amp; OEMs</Link></li>
              <li><Link href="/b2b-partners#international" style={{ color: '#94a3b8', textDecoration: 'none' }}>International Companies (India Entry)</Link></li>
              <li><Link href="/b2b-partners#dealers" style={{ color: '#94a3b8', textDecoration: 'none' }}>Distributors &amp; Dealers</Link></li>
              <li><Link href="/b2b-partners#services" style={{ color: '#94a3b8', textDecoration: 'none' }}>Service &amp; Repair Partners</Link></li>
              <li><Link href="/b2b-partners#training" style={{ color: '#94a3b8', textDecoration: 'none' }}>Training Academies</Link></li>
              <li style={{ marginTop: '0.5rem' }}>
                <Link
                  href="/auth/register?type=partner"
                  style={{
                    color: '#e06d00',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Join as B2B Partner →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: B2B RFQ & Contact */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              B2B Procurement
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
              <li><Link href="/buyer/rfqs/new" style={{ color: '#94a3b8', textDecoration: 'none' }}>Post B2B Drone RFP</Link></li>
              <li><Link href="/marketplace" style={{ color: '#94a3b8', textDecoration: 'none' }}>Search Drones &amp; Payloads</Link></li>
              <li><Link href="/buyer/rfqs" style={{ color: '#94a3b8', textDecoration: 'none' }}>Vendor Comparison Matrix</Link></li>
              <li><Link href="/about-us" style={{ color: '#94a3b8', textDecoration: 'none' }}>About GarudHub</Link></li>
              <li><Link href="/auth/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Partner Portal Login</Link></li>
            </ul>
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#1e293b', borderRadius: 8 }}>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', marginBottom: 4 }}>Need Sourcing Assistance?</div>
              <a href={`tel:${CONTACT_PHONE}`} style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.8rem', display: 'block' }}>
                📞 +91 {CONTACT_PHONE}
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all' }}>
                ✉️ {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid #1e293b',
            paddingTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8125rem' }}>
            &copy; {year} GarudHub — India&apos;s B2B Drone Ecosystem. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
            <Link href="/legal.php?page=tos" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/legal.php?page=privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/legal.php?page=refund" style={{ color: '#64748b', textDecoration: 'none' }}>Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
