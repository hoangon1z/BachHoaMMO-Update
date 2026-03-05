/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable image optimization for external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bachhoammo.store',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
    ],
    // Optimize images by default
    formats: ['image/webp', 'image/avif'],
    // Reduce image sizes
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Compress output
  compress: true,

  // Performance: generate ETags for caching
  generateEtags: true,

  // Power reduce bundle size
  experimental: {
    optimizeCss: false, // requires critters
  },

  // Rewrite /uploads/* to backend server for static files (avatars, products, etc.)
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/:path*`,
      },
    ];
  },

  // Add security and cache headers
  async headers() {
    return [
      {
        // Security headers for ALL pages
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Next.js static assets - immutable, cache forever
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public images and media
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000', // 30 days
          },
        ],
      },
      {
        // Home page - short cache with revalidation
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        // Explore/products pages - short cache
        source: '/explore/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
