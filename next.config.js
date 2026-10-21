const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8085';
const ssoEnabled = process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED === 'true';
const localInstance = process.env.CRM_DEV_INSTANCE;

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(localInstance && /^[a-z0-9-]{1,64}$/.test(localInstance) ? { distDir: '.next-' + localInstance } : {}),
  images: {
    remotePatterns: [{ hostname: 'localhost' }],
  },
  async rewrites() {
    if (ssoEnabled) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      sharp: false,
    };

    return config;
  },
}

module.exports = nextConfig

