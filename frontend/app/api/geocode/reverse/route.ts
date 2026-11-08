import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ParsedAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const GARUDHUB_USER_AGENT = 'GarudHub/1.0 (+https://garudhub.me)';

function parseGoogleComponents(components: Array<{ long_name: string; short_name: string; types: string[] }>): ParsedAddress {
  const find = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? '';

  const streetNumber = find('street_number');
  const route = find('route');
  const premise = find('premise') || find('subpremise');
  const neighborhood = find('neighborhood') || find('sublocality') || find('sublocality_level_1');
  const locality =
    find('locality') ||
    find('postal_town') ||
    find('administrative_area_level_3') ||
    find('administrative_area_level_2');
  const state = find('administrative_area_level_1');
  const pincode = find('postal_code');
  const country = find('country');

  let line1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  if (!line1) {
    line1 = find('plus_code') || neighborhood || locality || 'Address from map';
  }

  const line2 = premise ? premise : neighborhood && !line1.includes(neighborhood) ? neighborhood : undefined;

  return {
    line1,
    ...(line2 ? { line2 } : {}),
    city: locality || state || '—',
    state: state || country || '—',
    pincode: pincode || '—',
    country: country || 'India',
  };
}

function parseNominatimAddress(addr: Record<string, string | undefined>): ParsedAddress {
  const house = addr.house_number;
  const road = addr.road || addr.pedestrian || addr.path;
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter;
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    '';
  const state = addr.state || addr['ISO3166-2-lvl4'] || '';
  const pincode = addr.postcode || '';
  const country = addr.country || 'India';

  let line1 = [house, road].filter(Boolean).join(' ').trim();
  if (!line1) {
    line1 = suburb || city || road || 'Address from map';
  }

  const line2 =
    suburb && line1 && !line1.toLowerCase().includes(suburb.toLowerCase()) ? suburb : undefined;

  return {
    line1,
    ...(line2 ? { line2 } : {}),
    city: city || state || country || '—',
    state: state || country || '—',
    pincode: pincode || '—',
    country,
  };
}

export async function POST(req: Request) {
  let body: { lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat);
  const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', googleKey);
    url.searchParams.set('region', 'in');

    const gRes = await fetch(url.toString(), { cache: 'no-store' });
    if (!gRes.ok) {
      return NextResponse.json({ error: 'Geocoding service error' }, { status: 502 });
    }
    const gJson = (await gRes.json()) as {
      status: string;
      results?: Array<{ address_components: Array<{ long_name: string; short_name: string; types: string[] }> }>;
      error_message?: string;
    };
    if (gJson.status !== 'OK' && gJson.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: gJson.error_message || 'Could not resolve address' },
        { status: 422 },
      );
    }
    const first = gJson.results?.[0];
    if (!first) {
      return NextResponse.json({ error: 'No address found for this location' }, { status: 404 });
    }
    const parsed = parseGoogleComponents(first.address_components);
    return NextResponse.json({ source: 'google' as const, address: parsed });
  }

  // OpenStreetMap Nominatim — respect usage policy: identify app, no bulk / max 1 req/s recommended
  const nomUrl = new URL('https://nominatim.openstreetmap.org/reverse');
  nomUrl.searchParams.set('format', 'json');
  nomUrl.searchParams.set('lat', String(lat));
  nomUrl.searchParams.set('lon', String(lng));
  nomUrl.searchParams.set('addressdetails', '1');
  nomUrl.searchParams.set('accept-language', 'en');
  nomUrl.searchParams.set('email', 'support@garudhub.me');

  const nRes = await fetch(nomUrl.toString(), {
    headers: { 'User-Agent': GARUDHUB_USER_AGENT },
    cache: 'no-store',
  });

  if (!nRes.ok) {
    return NextResponse.json({ error: 'Geocoding service error' }, { status: 502 });
  }

  const nJson = (await nRes.json()) as { address?: Record<string, string> };
  if (!nJson.address) {
    return NextResponse.json({ error: 'No address found for this location' }, { status: 404 });
  }

  const parsed = parseNominatimAddress(nJson.address);
  return NextResponse.json({ source: 'nominatim' as const, address: parsed });
}
