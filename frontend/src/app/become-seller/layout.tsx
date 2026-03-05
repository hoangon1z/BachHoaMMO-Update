import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Trở thành người bán trên BachHoaMMO - Đăng ký bán hàng',
    description: 'Đăng ký trở thành người bán trên BachHoaMMO. Bán tài khoản, phần mềm, dịch vụ số. Hoa hồng thấp, hỗ trợ giao hàng tự động 24/7.',
    keywords: ['đăng ký bán hàng', 'trở thành seller', 'bán tài khoản', 'BachHoaMMO seller'],
    openGraph: {
        title: 'Trở thành người bán | BachHoaMMO',
        description: 'Bán tài khoản, phần mềm, dịch vụ số trên BachHoaMMO. Hoa hồng thấp, giao hàng tự động.',
        url: `${SITE_URL}/become-seller`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/become-seller` },
    robots: { index: true, follow: true },
};

export default function BecomeSellerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
