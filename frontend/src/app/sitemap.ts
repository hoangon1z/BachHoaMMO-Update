import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Fetch all products for sitemap (SEO critical!)
async function getAllProducts() {
  try {
    const response = await fetch(`${BACKEND_URL}/products?limit=1000&status=active`, {
      next: { revalidate: 3600 }, // Revalidate every hour
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
      next: { revalidate: 86400 }, // Revalidate every day
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
    const response = await fetch(`${BACKEND_URL}/shops?limit=500`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.shops || data || [];
  } catch (error) {
    console.error('Sitemap: Error fetching shops:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Fetch dynamic data in parallel
  const [products, categories, shops] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getAllShops(),
  ]);

  // Static routes (high priority)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/auction`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/payment-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/shopping-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/become-seller`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Product pages (HIGH PRIORITY for SEO - these are your money pages!)
  const productRoutes: MetadataRoute.Sitemap = products.map((product: any) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(product.updatedAt || product.createdAt || Date.now()),
    changeFrequency: 'daily' as const,
    priority: 0.85, // High priority for product pages
  }));

  // Category pages (for explore with category filter)
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category: any) => ({
    url: `${baseUrl}/explore?category=${category.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Shop pages
  const shopRoutes: MetadataRoute.Sitemap = shops.map((shop: any) => ({
    url: `${baseUrl}/shop/${shop.id}`,
    lastModified: new Date(shop.updatedAt || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...shopRoutes];
}
