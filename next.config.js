/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'rss-parser'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.mlb.com' },
      { protocol: 'https', hostname: '**.mlbstatic.com' },
    ],
  },
};

module.exports = nextConfig;
