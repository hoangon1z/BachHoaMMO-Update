import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Hướng dẫn mua hàng tại BachHoaMMO - Mua tài khoản an toàn',
    description: 'Hướng dẫn chi tiết cách mua tài khoản CapCut, Canva, Netflix, Spotify, ChatGPT tại BachHoaMMO. Thanh toán an toàn, giao hàng tự động 24/7.',
    keywords: ['hướng dẫn mua hàng', 'cách mua tài khoản', 'hướng dẫn thanh toán', 'BachHoaMMO'],
    openGraph: {
        title: 'Hướng dẫn mua hàng | BachHoaMMO',
        description: 'Hướng dẫn mua tài khoản an toàn tại BachHoaMMO. Thanh toán dễ dàng, giao hàng tự động.',
        url: `${SITE_URL}/shopping-guide`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/shopping-guide` },
    robots: { index: true, follow: true },
};

export default function ShoppingGuideLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
