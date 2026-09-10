import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Performance: log Google Sheets fetches in dev
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // TypeScript strict build
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
