'use client';

import { RequireAuth } from '@/components/platform/AuthProvider';
import { MessageThreads } from '@/components/platform/MessageThreads';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';

export default function BuyerMessagesPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Messages"
          subtitle="Your conversations with suppliers. Start new ones from any listing or vendor profile."
        />
        <div className="platform-form-layout platform-form-layout--full">
          <MessageThreads role="buyer" />
        </div>
      </div>
    </RequireAuth>
  );
}
