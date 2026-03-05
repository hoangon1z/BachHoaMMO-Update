import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Hướng dẫn thanh toán | BachHoaMMO - Nạp tiền mua tài khoản',
    description: 'Hướng dẫn chi tiết các phương thức thanh toán tại BachHoaMMO: chuyển khoản ngân hàng, ví điện tử, thẻ cào. Nạp tiền nhanh chóng, an toàn.',
    keywords: ['hướng dẫn thanh toán', 'nạp tiền', 'phương thức thanh toán', 'BachHoaMMO'],
    openGraph: {
        title: 'Hướng dẫn thanh toán | BachHoaMMO',
        description: 'Hướng dẫn thanh toán và nạp tiền tại BachHoaMMO. Nhiều phương thức, nhanh chóng.',
        url: `${SITE_URL}/payment-guide`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/payment-guide` },
    robots: { index: true, follow: true },
};

export default function PaymentGuideLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
