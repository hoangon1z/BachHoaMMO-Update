import { MetadataRoute } from 'next';

// Force dynamic generation - sitemap should always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Fetch all products for sitemap (SEO critical!)
async function getAllProducts() {
  try {
    const response = await fetch(`${BACKEND_URL}/products?limit=5000&status=active`, {
      cache: 'no-store', // Always fetch fresh data
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.products || data || [];
  } catch (error) {
    console.error('Sitemap: Error fetching products:', error);
    return [];
  }
}

// Fetch all categories for sitemap
async function getAllCategories() {
  try {
    const response = await fetch(`${BACKEND_URL}/categories`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Sitemap: Error fetching categories:', error);
    return [];
  }
}

// Fetch all shops for sitemap
async function getAllShops() {
  try {
    const response = await fetch(`${BACKEND_URL}/shop/all`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Sitemap: Error fetching shops:', error);
    return [];
  }
}

// Fetch all published blog posts for sitemap
async function getAllBlogPosts() {
  try {
    const response = await fetch(
      `${BACKEND_URL}/blog/posts?status=PUBLISHED&limit=500`,
      { cache: 'no-store' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.posts || data.data?.posts || data || [];
  } catch (error) {
    console.error('Sitemap: Error fetching blog posts:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Fetch dynamic data in parallel
  const [products, shops, blogPosts, categories] = await Promise.all([
    getAllProducts(),
    getAllShops(),
    getAllBlogPosts(),
    getAllCategories(),
  ]);

  // Static routes (high priority)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/auction`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/blogs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/become-seller`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/shopping-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/seller-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/payment-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Product pages (HIGH PRIORITY for SEO - these are your money pages!)
  // Use slug for SEO-friendly URLs: /products/mua-tai-khoan-netflix-premium
  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product: any) => product.slug) // Only include products with slug
    .map((product: any) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt || product.createdAt || Date.now()),
      changeFrequency: 'daily' as const,
      priority: 0.85, // High priority for product pages
    }));

  // Category pages using clean /explore?category=id URLs
  const categoryRoutes: MetadataRoute.Sitemap = (Array.isArray(categories) ? categories : [])
    .filter((cat: any) => cat.id)
    .map((cat: any) => ({
      url: `${baseUrl}/explore?category=${cat.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

  // Shop pages
  const shopRoutes: MetadataRoute.Sitemap = (Array.isArray(shops) ? shops : []).map((shop: any) => ({
    url: `${baseUrl}/shop/${shop.userId || shop.id}`,
    lastModified: new Date(shop.updatedAt || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Blog posts (SEO)
  const blogRoutes: MetadataRoute.Sitemap = (Array.isArray(blogPosts) ? blogPosts : []).map(
    (post: { slug: string; updatedAt?: string; publishedAt?: string }) => ({
      url: `${baseUrl}/blogs/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })
  );

  return [
    ...staticRoutes,
    ...productRoutes,
    ...categoryRoutes,
    ...shopRoutes,
    ...blogRoutes,
  ];
}

