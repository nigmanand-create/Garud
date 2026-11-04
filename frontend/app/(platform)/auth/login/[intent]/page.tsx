import { notFound } from 'next/navigation';
import { isLoginIntent, LOGIN_INTENTS } from '@/lib/platform/auth-login';
import { LoginPageContent } from '../LoginPageContent';

export function generateStaticParams() {
  return LOGIN_INTENTS.map((intent) => ({ intent }));
}

export default async function RoleLoginPage({
  params,
}: {
  params: Promise<{ intent: string }>;
}) {
  const { intent } = await params;
  if (!isLoginIntent(intent)) {
    notFound();
  }
  return <LoginPageContent intent={intent} />;
}
