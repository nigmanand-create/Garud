export type ReverseGeocodeAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type ReverseGeocodeResult = {
  source: 'google' | 'nominatim';
  address: ReverseGeocodeAddress;
};

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const res = await fetch('/api/geocode/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  const data = (await res.json()) as ReverseGeocodeResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not resolve address');
  }
  if (!data.address) {
    throw new Error('Could not resolve address');
  }
  return { source: data.source, address: data.address };
}
