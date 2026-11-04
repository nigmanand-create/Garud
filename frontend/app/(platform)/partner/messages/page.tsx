'use client';

import { RequireAuth } from '@/components/platform/AuthProvider';
import { MessageThreads } from '@/components/platform/MessageThreads';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

export default function PartnerMessagesPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <PartnerPageShell>
        <div className="platform-partner-form-page">
          <PlatformPageHeader
            title="Messages"
            subtitle="Threaded conversations with buyers who contacted you from your listings or profile."
          />
          <div className="platform-form-layout platform-form-layout--full">
            <MessageThreads role="partner" />
          </div>
        </div>
      </PartnerPageShell>
    </RequireAuth>
  );
}
