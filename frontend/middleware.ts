import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveSnapshotBridge } from '@/lib/snapshot-bridge';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const bridge = resolveSnapshotBridge(pathname);
  if (bridge) {
    const url = request.nextUrl.clone();
    url.pathname = bridge.pathname;
    url.search = bridge.search ?? '';
    url.hash = bridge.hash ?? '';
    return NextResponse.redirect(url, 307);
  }

  if (pathname === '/legal.php') {
    const page = searchParams.get('page');
    if (page) {
      const url = request.nextUrl.clone();
      url.pathname = `/legal.php/${page}`;
      url.search = '';
      return NextResponse.rewrite(url);
    }
  }

  if (pathname === '/blogging') {
    const slug = searchParams.get('slug');
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/blogging/post/${slug}`;
      url.search = '';
      return NextResponse.rewrite(url);
    }
    const category = searchParams.get('category');
    if (category) {
      const url = request.nextUrl.clone();
      url.pathname = `/blogging/category/${category}`;
      url.search = '';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/legal.php',
    '/blogging',
    // Keep in sync with SNAPSHOT_REACT_BRIDGE (lib/snapshot-bridge.ts); matcher must be literal.
    '/drone-marketplace',
    '/drone-marketplace/',
    '/drone-accessories',
    '/drone-accessories/',
    '/partner-with-us',
    '/partner-with-us/',
    '/drone-training',
    '/drone-training/',
    '/dgca-compliance',
    '/dgca-compliance/',
    '/repairs-maintenance',
    '/repairs-maintenance/',
    '/finance-insurance',
    '/finance-insurance/',
    '/government-projects-schemes',
    '/government-projects-schemes/',
    '/scrap-recycling',
    '/scrap-recycling/',
    '/industries-we-serve',
    '/industries-we-serve/',
    '/edp-professional-services',
    '/edp-professional-services/',
    '/india-market-entry',
    '/india-market-entry/',
    '/about-us',
    '/about-us/',
    '/drone-jobs-career',
    '/drone-jobs-career/',
    '/drone-operations-setup',
    '/drone-operations-setup/',
    '/business-setup-in-india',
    '/business-setup-in-india/',
    '/manufacturing-technology-collaboration',
    '/manufacturing-technology-collaboration/',
    '/market-entry-consultancy',
    '/market-entry-consultancy/',
    '/enquiry.php',
    '/enquiry.php/',
    '/loan-calculators.php',
    '/loan-calculators.php/',
    '/about.php',
    '/about.php/',
    '/blog',
    '/blog/',
    '/legal/privacy',
    '/legal/privacy/',
    '/legal/terms',
    '/legal/terms/',
    '/legal/tos',
    '/legal/tos/',
    '/legal/refund',
    '/legal/refund/',
  ],
};
