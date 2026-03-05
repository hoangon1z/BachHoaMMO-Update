import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Đấu giá Gian hàng TOP - Quảng cáo sản phẩm trên BachHoaMMO',
    description: 'Tham gia đấu giá vị trí TOP trên trang chủ BachHoaMMO. Đưa gian hàng của bạn lên vị trí nổi bật nhất. Đấu giá công bằng, minh bạch.',
    keywords: [
        'đấu giá gian hàng',
        'quảng cáo BachHoaMMO',
        'gian hàng TOP',
        'đấu giá vị trí',
        'BachHoaMMO auction',
    ],
    openGraph: {
        title: 'Đấu giá Gian hàng TOP | BachHoaMMO',
        description: 'Tham gia đấu giá vị trí TOP trên trang chủ BachHoaMMO. Quảng cáo sản phẩm hiệu quả.',
        url: `${SITE_URL}/auction`,
        type: 'website',
        siteName: 'BachHoaMMO',
        images: [{ url: `${SITE_URL}/images/logobachhoa.png`, width: 512, height: 512, alt: 'BachHoaMMO Auction' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Đấu giá Gian hàng TOP | BachHoaMMO',
        description: 'Đấu giá vị trí TOP trên trang chủ BachHoaMMO.',
    },
    alternates: { canonical: `${SITE_URL}/auction` },
    robots: { index: true, follow: true },
};

export default function AuctionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
