import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Chính sách đổi trả & hoàn tiền | BachHoaMMO',
    description: 'Chính sách đổi trả, hoàn tiền minh bạch tại BachHoaMMO. Bảo vệ quyền lợi khách hàng 100%. Hỗ trợ xử lý khiếu nại nhanh chóng.',
    keywords: ['chính sách đổi trả', 'hoàn tiền', 'bảo hành', 'BachHoaMMO'],
    openGraph: {
        title: 'Chính sách đổi trả & hoàn tiền | BachHoaMMO',
        description: 'Chính sách đổi trả, hoàn tiền minh bạch tại BachHoaMMO.',
        url: `${SITE_URL}/refund-policy`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/refund-policy` },
    robots: { index: true, follow: true },
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
