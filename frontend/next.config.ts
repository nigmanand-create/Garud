import type { NextConfig } from 'next';
import { join } from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname),
  async redirects() {
    return [{ source: '/about.php', destination: '/about-us', permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://garudhub.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
