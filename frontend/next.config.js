/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next.js 14 App Router auto-serves favicon.ico from app/ folder
  // No redirect needed!

  // Rewrite /uploads/* to backend server for static files (avatars, products, etc.)
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/:path*`,
      },
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
