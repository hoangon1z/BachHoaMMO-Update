import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface BlogPostMeta {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  updatedAt: string;
  author?: { name: string };
}

async function getPostBySlug(slug: string): Promise<BlogPostMeta | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/blog/posts/slug/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Bài viết không tồn tại | BachHoaMMO' };

  const title = post.metaTitle || post.title;
  const rawDesc =
    post.metaDescription ||
    post.excerpt ||
    (typeof post.content === 'string' ? post.content.replace(/<[^>]*>/g, '').slice(0, 160) : '');
  const description = rawDesc.trim().slice(0, 160);
  const url = `${SITE_URL}/blogs/${post.slug}`;
  const image = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${SITE_URL}${post.coverImage}`)
    : `${SITE_URL}/images/logobachhoa.png`;

  return {
    title: `${title} | BachHoaMMO`,
    description,
    openGraph: {
      title: `${title} | BachHoaMMO`,
      description,
      url,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      siteName: 'BachHoaMMO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | BachHoaMMO`,
      description,
      images: [image],
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

/** JSON-LD BlogPosting for Google Rich Results */
function BlogPostingJsonLd({
  post,
  url,
  imageUrl,
}: {
  post: BlogPostMeta;
  url: string;
  imageUrl: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metaTitle || post.title,
    description:
      post.metaDescription ||
      post.excerpt ||
      (typeof post.content === 'string'
        ? post.content.replace(/<[^>]*>/g, '').slice(0, 200)
        : ''),
    image: imageUrl,
    url,
    datePublished: post.publishedAt || post.updatedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'BachHoaMMO',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BachHoaMMO',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logobachhoa.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function BlogSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blogs/${post.slug}`;
  const imageUrl = post.coverImage
    ? post.coverImage.startsWith('http')
      ? post.coverImage
      : `${SITE_URL}${post.coverImage}`
    : `${SITE_URL}/images/logobachhoa.png`;

  return (
    <>
      <BlogPostingJsonLd post={post} url={url} imageUrl={imageUrl} />
      {children}
    </>
  );
}
