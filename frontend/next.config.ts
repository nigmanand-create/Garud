import type { NextConfig } from 'next';
import { join } from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname),
  async redirects() {
    return [{ source: '/about.php', destination: '/about-us', permanent: false }];
  },
  // CDN note (docs/PRODUCTION_READINESS.md § CDN): Cloudflare caches /assets/* at the edge
  // when the origin allows it. Filenames are not content-hashed, so keep a modest TTL.
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Same-origin Garud Nest API (via Next proxy). Do not proxy to legacy garudhub.com.
    return [
      {
        source: '/api/v1/:path*',
        destination: '/platform-api/v1/:path*',
      },
      {
        source: '/api/enquiry',
        destination: '/platform-api/v1/enquiries',
      },
    ];
  },
};

export default nextConfig;
