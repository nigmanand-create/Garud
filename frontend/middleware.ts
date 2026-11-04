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
  ],
};
