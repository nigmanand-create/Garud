import type { VerificationStatus } from '@/lib/api/types';

export type PartnerOnboardingInput = {
  verificationStatus: VerificationStatus;
  canEdit: boolean;
  canListProducts: boolean;
  documentCount: number;
  listingCount: number;
  companyName: string;
  country: string;
  contactPersonName: string;
  contactEmail: string;
  contactMobile: string;
};

export type OnboardingStepId =
  | 'application'
  | 'documents'
  | 'submit'
  | 'review'
  | 'catalog';

export type OnboardingStepState = 'complete' | 'current' | 'upcoming' | 'waiting';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  state: OnboardingStepState;
};

function applicationComplete(data: PartnerOnboardingInput): boolean {
  return (
    Boolean(data.companyName?.trim()) &&
    Boolean(data.country?.trim()) &&
    Boolean(data.contactPersonName?.trim()) &&
    Boolean(data.contactEmail?.trim()) &&
    Boolean(data.contactMobile?.trim())
  );
}

const EDITABLE_VERIFICATION_STATUSES: VerificationStatus[] = [
  'DRAFT',
  'REJECTED',
];

function submittedOrBeyond(status: VerificationStatus): boolean {
  return !EDITABLE_VERIFICATION_STATUSES.includes(status);
}

/** Matches backend `EDITABLE_STATUSES` / `canEdit` on GET /partner/me. */
export function isPartnerApplicationEditable(
  status: VerificationStatus,
): boolean {
  return EDITABLE_VERIFICATION_STATUSES.includes(status);
}

export function getPartnerDocumentsLockCallout(
  status: VerificationStatus,
): string | null {
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return 'Document uploads are locked while Garud reviews your application.';
  }
  if (status === 'APPROVED') {
    return 'Your company is verified. Document uploads are locked unless Garud requests an update.';
  }
  return null;
}

export function getPartnerOnboardingSteps(
  data: PartnerOnboardingInput,
): OnboardingStep[] {
  const appDone = applicationComplete(data);
  const docsDone = data.documentCount > 0;
  const submitted = submittedOrBeyond(data.verificationStatus);
  const approved = data.verificationStatus === 'APPROVED';
  const inReview =
    data.verificationStatus === 'SUBMITTED' ||
    data.verificationStatus === 'UNDER_REVIEW';

  const steps: Omit<OnboardingStep, 'state'>[] = [
    {
      id: 'application',
      title: 'Company profile',
      description: 'Legal name, location, and primary contact details.',
      href: '/partner/application',
    },
    {
      id: 'documents',
      title: 'Verification documents',
      description: 'GST, registration, and authorization files.',
      href: '/partner/documents',
    },
    {
      id: 'submit',
      title: 'Submit application',
      description: 'Send your profile to Garud for verification.',
      href: '/partner/application',
    },
    {
      id: 'review',
      title: 'Garud review',
      description: 'We verify your company before marketplace listing.',
      href: '/partner',
    },
    {
      id: 'catalog',
      title: 'Publish catalog',
      description: 'Add products and services to the public marketplace.',
      href: '/partner/catalog',
    },
  ];

  const completeFlags = [
    appDone,
    docsDone,
    submitted,
    approved,
    data.listingCount > 0,
  ];

  let currentIndex = completeFlags.findIndex((done) => !done);
  if (currentIndex === -1) currentIndex = steps.length - 1;

  return steps.map((step, i) => {
    let state: OnboardingStepState = 'upcoming';
    if (completeFlags[i]) {
      state = 'complete';
    } else if (i === currentIndex) {
      state =
        step.id === 'review' && inReview && !approved ? 'waiting' : 'current';
    }
    return { ...step, state };
  });
}

export function getPartnerPrimaryCta(data: PartnerOnboardingInput): {
  label: string;
  href: string;
} | null {
  const steps = getPartnerOnboardingSteps(data);
  const current = steps.find((s) => s.state === 'current' || s.state === 'waiting');
  if (!current) {
    if (data.canListProducts) {
      return { label: 'Manage listings', href: '/partner/catalog' };
    }
    return null;
  }
  if (current.id === 'submit') {
    return { label: 'Submit for verification', href: '/partner/application' };
  }
  if (current.id === 'review') {
    return { label: 'View application status', href: '/partner/application' };
  }
  if (current.id === 'catalog') {
    return { label: 'Add your first listing', href: '/partner/catalog/new' };
  }
  return {
    label: current.id === 'documents' ? 'Upload documents' : 'Continue application',
    href: current.href,
  };
}
