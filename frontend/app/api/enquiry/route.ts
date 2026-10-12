const UPSTREAM = 'https://garudhub.com/enquiry.php';

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
  const body = await request.arrayBuffer();

  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      'content-type': contentType,
      cookie: request.headers.get('cookie') ?? '',
    },
    body,
    redirect: 'manual',
  });

  const headers = new Headers();
  const location = upstream.headers.get('location');
  if (location) {
    headers.set('location', location.replace('https://garudhub.com', ''));
  }
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) headers.set('set-cookie', setCookie);

  const responseContentType = upstream.headers.get('content-type');
  if (responseContentType) headers.set('content-type', responseContentType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
