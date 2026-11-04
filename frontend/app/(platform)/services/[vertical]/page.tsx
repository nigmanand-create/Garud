import { notFound, redirect } from 'next/navigation';
import { serviceVerticalRedirectPath } from '@/lib/platform/verticals';

type Props = {
  params: Promise<{ vertical: string }>;
};

/** Preset category (or sibling journey) then land on the service request form. */
export default async function ServiceVerticalRedirectPage({ params }: Props) {
  const { vertical } = await params;
  const target = serviceVerticalRedirectPath(vertical);
  if (!target) {
    notFound();
  }
  redirect(target);
}
