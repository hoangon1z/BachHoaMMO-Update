import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
  title: 'Blogs - Chia sẻ kinh nghiệm MMO, hướng dẫn mua bán tài khoản | BachHoaMMO',
  description:
    'Đọc blog BachHoaMMO: kinh nghiệm MMO, hướng dẫn mua tài khoản CapCut, Canva, Netflix, Spotify an toàn, mẹo bán hàng và cập nhật thị trường.',
  keywords: [
    'blog MMO',
    'kinh nghiệm MMO',
    'hướng dẫn mua tài khoản',
    'BachHoaMMO blog',
    'chia sẻ MMO',
  ],
  openGraph: {
    title: 'Blogs | BachHoaMMO - Chia sẻ kinh nghiệm MMO',
    description: 'Đọc blog kinh nghiệm MMO, hướng dẫn mua bán tài khoản an toàn tại BachHoaMMO.',
    url: `${SITE_URL}/blogs`,
    type: 'website',
    siteName: 'BachHoaMMO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blogs | BachHoaMMO',
    description: 'Đọc blog kinh nghiệm MMO, hướng dẫn mua bán tài khoản an toàn.',
  },
  alternates: {
    canonical: `${SITE_URL}/blogs`,
  },
  robots: { index: true, follow: true },
};

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
