import Link from 'next/link';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  getPartnerOnboardingSteps,
  type PartnerOnboardingInput,
} from '@/lib/platform/partner-onboarding';

type PartnerOnboardingChecklistProps = {
  data: PartnerOnboardingInput;
  verificationStatus: string;
};

export function PartnerOnboardingChecklist({
  data,
  verificationStatus,
}: PartnerOnboardingChecklistProps) {
  const steps = getPartnerOnboardingSteps(data);

  if (verificationStatus === 'APPROVED') {
    return (
      <div className="platform-card platform-partner-checklist platform-partner-checklist--compact">
        <div className="platform-partner-checklist-header">
          <div>
            <h2 className="platform-partner-checklist-title">Partner onboarding</h2>
            <p className="platform-muted platform-partner-checklist-desc">
              Verification complete — your organization is approved for marketplace
              operations.
            </p>
          </div>
          <StatusBadge status={verificationStatus} />
        </div>
        <Link href="/partner/application" className="platform-checklist-link">
          View company profile
        </Link>
      </div>
    );
  }

  return (
    <div className="platform-card platform-partner-checklist">
      <div className="platform-partner-checklist-header">
        <div>
          <h2 className="platform-partner-checklist-title">Partner onboarding</h2>
          <p className="platform-muted platform-partner-checklist-desc">
            Complete each step to get verified and list on the marketplace.
          </p>
        </div>
        <StatusBadge status={verificationStatus} />
      </div>
      <ol className="platform-checklist">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`platform-checklist-item platform-checklist-item--${step.state}`}
          >
            <span className="platform-checklist-marker" aria-hidden>
              {step.state === 'complete' ? '✓' : index + 1}
            </span>
            <div className="platform-checklist-body">
              <strong>{step.title}</strong>
              <p className="platform-muted">{step.description}</p>
              {(step.state === 'current' || step.state === 'waiting') && (
                <Link href={step.href} className="platform-checklist-link">
                  {step.state === 'waiting' ? 'View status' : 'Continue'}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
