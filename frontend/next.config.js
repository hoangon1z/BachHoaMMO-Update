/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Redirect /favicon.ico to logo so Google Search shows custom icon
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/images/bachhoa.png', permanent: true },
    ];
  },

  // Add headers to prevent Cloudflare from caching dynamic pages
  async headers() {
    return [
      {
        // Home page - always fresh (banners, products change frequently)
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Cloudflare-CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        // Explore/products pages - also dynamic
        source: '/explore/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
