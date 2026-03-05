import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
    title: 'Chính sách bảo mật | BachHoaMMO',
    description: 'Chính sách bảo mật thông tin người dùng tại BachHoaMMO. Cam kết bảo vệ thông tin cá nhân và dữ liệu khách hàng.',
    keywords: ['chính sách bảo mật', 'bảo mật thông tin', 'privacy policy', 'BachHoaMMO'],
    openGraph: {
        title: 'Chính sách bảo mật | BachHoaMMO',
        description: 'Chính sách bảo mật thông tin người dùng tại BachHoaMMO.',
        url: `${SITE_URL}/privacy`,
        type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/privacy` },
    robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
