import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';

async function proxy(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = new URL(`${BACKEND}/api/v1/${path}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  // Correlation id: Nest reuses a well-formed inbound id (and echoes it back), else mints one.
  const requestId = request.headers.get('x-request-id');
  if (requestId) headers.set('x-request-id', requestId);

  // Real client IP for per-IP rate limiting. Without this every visitor shares the Next
  // server's IP (Nest `trust proxy 1` reads the last X-Forwarded-For hop).
  const clientIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  // Razorpay webhooks: the signature is an HMAC over the raw body, so it must reach Nest
  // untouched (body is forwarded as raw bytes below).
  const rzpSignature = request.headers.get('x-razorpay-signature');
  if (rzpSignature) headers.set('x-razorpay-signature', rzpSignature);
  const rzpEventId = request.headers.get('x-razorpay-event-id');
  if (rzpEventId) headers.set('x-razorpay-event-id', rzpEventId);

  const method = request.method;
  let body: ArrayBuffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(url.toString(), {
    method,
    headers,
    body: body?.byteLength ? body : undefined,
  });

  const resHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) resHeaders.set('Content-Type', ct);
  const cd = upstream.headers.get('content-disposition');
  if (cd) resHeaders.set('Content-Disposition', cd);
  const upstreamRequestId = upstream.headers.get('x-request-id');
  if (upstreamRequestId) resHeaders.set('x-request-id', upstreamRequestId);

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: resHeaders });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: upstream.status,
    headers: resHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
