import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Điều khoản sử dụng | BachHoaMMO',
    description: 'Điều khoản và điều kiện sử dụng dịch vụ BachHoaMMO. Quy định về mua bán, thanh toán, bảo hành và trách nhiệm các bên.',
    keywords: ['điều khoản sử dụng', 'điều kiện dịch vụ', 'quy định', 'BachHoaMMO'],
    openGraph: {
        title: 'Điều khoản sử dụng | BachHoaMMO',
        description: 'Điều khoản và điều kiện sử dụng dịch vụ BachHoaMMO.',
        url: `${SITE_URL}/terms`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/terms` },
    robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
