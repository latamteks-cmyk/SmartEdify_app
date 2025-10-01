/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    // Service URLs
    GATEWAY_URL: process.env.GATEWAY_URL || 'http://localhost:8080',
    IDENTITY_SERVICE_URL: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
    TENANCY_SERVICE_URL: process.env.TENANCY_SERVICE_URL || 'http://localhost:3003',
    COMPLIANCE_SERVICE_URL: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3012',
    RESERVATION_SERVICE_URL: process.env.RESERVATION_SERVICE_URL || 'http://localhost:3013',
    FINANCE_SERVICE_URL: process.env.FINANCE_SERVICE_URL || 'http://localhost:3007',
    GOVERNANCE_SERVICE_URL: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:3011',
    NOTIFICATIONS_SERVICE_URL: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005',
    DOCUMENTS_SERVICE_URL: process.env.DOCUMENTS_SERVICE_URL || 'http://localhost:3006',
    USER_PROFILES_SERVICE_URL: process.env.USER_PROFILES_SERVICE_URL || 'http://localhost:3002',
    STREAMING_SERVICE_URL: process.env.STREAMING_SERVICE_URL || 'http://localhost:3014',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' http://localhost:* ws://localhost:*",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/services/:path*',
        destination: `${process.env.GATEWAY_URL || 'http://localhost:8080'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;