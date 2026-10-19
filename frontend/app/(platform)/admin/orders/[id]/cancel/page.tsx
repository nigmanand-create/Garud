import { redirect } from 'next/navigation';

export default async function OrderCancelRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/orders/${id}`);
}
