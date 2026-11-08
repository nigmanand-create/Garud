# Reverse geocoding (buyer addresses)

The buyer **Saved addresses** page can fill city, state, pincode, and street lines from the device location.

## Behaviour

1. The browser asks for location via `navigator.geolocation`.
2. The Next.js route `POST /api/geocode/reverse` resolves coordinates to address text.

## Google Maps (optional)

If `GOOGLE_MAPS_API_KEY` is set in the **frontend** environment (server-side only; not a `NEXT_PUBLIC_` variable), the app uses the [Google Geocoding API](https://developers.google.com/maps/documentation/geocoding/overview) with `region=in` for India bias.

## OpenStreetMap Nominatim (default)

Without a Google key, the app uses [Nominatim](https://nominatim.org/release-docs/latest/api/Reverse/). The server sends a static `User-Agent` identifying **GarudHub** and includes `email` in the query for policy compliance. Clients should not hammer the endpoint: the UI debounces calls and users trigger location manually.

See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) for bulk or automated use.
