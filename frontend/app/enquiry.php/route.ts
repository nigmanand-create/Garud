import { NextResponse } from 'next/server';

/**
 * Legacy PHP enquiry URL — retired. Native lead capture lives at `/enquiry`
 * (POST `/platform-api/v1/enquiries`). Preserve query params (subject, service, …).
 */
export const dynamic = 'force-dynamic';

function nativeEnquiryUrl(request: Request): URL {
  const url = new URL(request.url);
  const target = new URL('/enquiry', url);
  target.search = url.search;
  return target;
}

export function GET(request: Request) {
  return NextResponse.redirect(nativeEnquiryUrl(request), 308);
}

/** Stale form posts are bounced to the native form (never proxied to garudhub.com). */
export function POST(request: Request) {
  return NextResponse.redirect(nativeEnquiryUrl(request), 303);
}
