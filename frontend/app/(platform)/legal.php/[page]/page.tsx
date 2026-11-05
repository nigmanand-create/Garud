import { notFound, permanentRedirect } from 'next/navigation';

const LEGACY_TO_CANONICAL: Record<string, string> = {
  privacy: '/legal/privacy',
  tos: '/legal/terms',
  refund: '/legal/refund',
};

type PageProps = { params: Promise<{ page: string }> };

/** Legacy `/legal.php/:page` → canonical `/legal/*` (308). */
export default async function LegalLegacyRedirectPage({ params }: PageProps) {
  const { page } = await params;
  const dest = LEGACY_TO_CANONICAL[page];
  if (!dest) notFound();
  permanentRedirect(dest);
}
