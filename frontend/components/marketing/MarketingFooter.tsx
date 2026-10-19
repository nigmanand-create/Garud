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
      className="ctype-footer ctype-light"
      style={
        {
          '--ctype-bg-color': '#f6f2e7',
          '--ctype-text-color': '#000000',
        } as React.CSSProperties
      }
    >
      <div className="ctype-part-a">
        <div className="container">
          <div className="ctype-grid">
            <div className="ctype-logo-column">
              <img src={LOGO_URL} alt="DroneHub" className="ctype-logo" />
              <p className="ctype-company-desc">
                DroneHub connects buyers, pilots and service providers across India&apos;s drone
                ecosystem — compliance, training, marketplace, repairs, loans and insurance
              </p>
              <div className="ctype-certifications">
                <span className="ctype-cert-badge">
                  <i className="bi bi-shield-check" /> Verified Partner
                </span>
                <span className="ctype-cert-badge">
                  <i className="bi bi-patch-check" /> Trusted
                </span>
              </div>
            </div>
            <div className="ctype-column">
              <h4 className="ctype-column-title">Services</h4>
              <ul className="ctype-column-links">
                <li><Link href="/dgca-compliance">DGCA Compliance</Link></li>
                <li><Link href="/drone-training">Drone Training</Link></li>
                <li><Link href="/marketplace">Marketplace</Link></li>
                <li><Link href="/marketplace?section=accessories">Accessories</Link></li>
                <li><Link href="/repairs-maintenance">Repairs Maintenance</Link></li>
              </ul>
            </div>
            <div className="ctype-column">
              <h4 className="ctype-column-title">Company</h4>
              <ul className="ctype-column-links">
                <li><Link href="/about-us">About Us</Link></li>
                <li><Link href="/drone-jobs-career">Careers / Jobs</Link></li>
                <li><Link href="/government-projects-schemes">Government Projects</Link></li>
                <li><Link href="/finance-insurance">Loans Insurance</Link></li>
                <li><Link href="/scrap-recycling">Scrap Recycling</Link></li>
              </ul>
            </div>
            <div className="ctype-column">
              <h4 className="ctype-column-title">Resources</h4>
              <ul className="ctype-column-links">
                <li><Link href="/about-us">About Us</Link></li>
                <li><Link href="/enquiry.php">Contact Us</Link></li>
                <li><Link href="/drone-jobs-career">Careers</Link></li>
              </ul>
            </div>
            <div className="ctype-column">
              <h4 className="ctype-column-title">Get in Touch</h4>
              <ul className="ctype-column-links">
                <li>
                  <a href={`tel:${CONTACT_PHONE}`}>Phone {CONTACT_PHONE}</a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`}>Email {CONTACT_EMAIL}</a>
                </li>
              </ul>
            </div>
            <div className="ctype-column ctype-elements-column">
              <h4 className="ctype-column-title">Quick Access</h4>
              <ul className="ctype-column-links">
                <li>
                  <a href="/loan-calculators.php">
                    <i className="bi bi-calculator" style={{ marginRight: 6 }} />
                    Loan Calculators
                  </a>
                </li>
                <li>
                  <a href="/enquiry.php">
                    <i className="bi bi-headset" style={{ marginRight: 6 }} />
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="ctype-button-row">
        <div className="container">
          <div className="ctype-buttons">
            <a
              href="/enquiry.php"
              className="ctype-cta-btn"
              style={{ background: '#a25ddc', border: '2px solid #a25ddc', color: '#ffffff' }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
      <div className="ctype-trust-social-row">
        <div className="container">
          <div className="ctype-trust-badges" style={{ color: '#000000' }}>
            <div className="ctype-trust-badge">
              <i className="bi bi-patch-check" />
              <span>Verified Providers &amp; Partners</span>
            </div>
            <div className="ctype-trust-badge">
              <i className="bi bi-patch-check" />
              <span>Pan-India Service Network</span>
            </div>
            <div className="ctype-trust-badge">
              <i className="bi bi-patch-check" />
              <span>Secure &amp; Confidential Data</span>
            </div>
          </div>
        </div>
      </div>
      <div className="ctype-part-b">
        <div className="container">
          <div className="ctype-bottom-bar">
            <p className="ctype-copyright">&copy; {year} DroneHub</p>
            <div className="ctype-legal-links">
              <a href="/legal.php?page=tos">Terms of Service</a>
              <span className="ctype-legal-separator">|</span>
              <a href="/legal.php?page=privacy">Privacy Policy</a>
              <span className="ctype-legal-separator">|</span>
              <a href="/legal.php?page=refund">Disclaimer</a>
            </div>
          </div>
        </div>
      </div>
      <div className="ctype-branding">
        <div className="container">
          <p>
            Designed &amp; Managed by{' '}
            <a href="https://vistarkriya.com" target="_blank" rel="noopener noreferrer">
              VistarKriya
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
