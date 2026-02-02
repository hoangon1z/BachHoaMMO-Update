import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/seller/',
          '/dashboard',
          '/checkout',
          '/cart',
          '/messages',
          '/orders/',
          '/profile',
          '/settings',
          '/wallet/',
          '/login',
          '/register',
          '/forgot-password',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/seller/',
          '/dashboard',
          '/checkout',
          '/cart',
          '/messages',
          '/orders/',
          '/profile',
          '/settings',
          '/wallet/',
          '/login',
          '/register',
          '/forgot-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
