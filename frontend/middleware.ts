import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/drone-accessories' || pathname === '/drone-accessories/') {
    const url = request.nextUrl.clone();
    url.pathname = '/marketplace';
    url.search = 'section=accessories';
    return NextResponse.redirect(url, 307);
  }

  if (pathname === '/drone-marketplace' || pathname === '/drone-marketplace/') {
    const url = request.nextUrl.clone();
    url.pathname = '/marketplace';
    url.search = '';
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
    '/drone-accessories',
    '/drone-accessories/',
    '/drone-marketplace',
    '/drone-marketplace/',
  ],
};
