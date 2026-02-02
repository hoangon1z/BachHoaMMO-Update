import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
  title: 'Khám phá sản phẩm số - Tài khoản game, Netflix, Spotify | BachHoaMMO',
  description: 'Khám phá hàng ngàn sản phẩm số chất lượng: tài khoản Netflix, Spotify, game Steam, Origin, Epic Games, phần mềm bản quyền. Giá tốt nhất, uy tín hàng đầu Việt Nam.',
  keywords: [
    'mua tài khoản Netflix',
    'mua tài khoản Spotify',
    'tài khoản game giá rẻ',
    'mua key game Steam',
    'tài khoản Origin',
    'Epic Games account',
    'phần mềm bản quyền',
    'sản phẩm số',
    'chợ MMO Việt Nam',
  ],
  openGraph: {
    title: 'Khám phá sản phẩm số | BachHoaMMO',
    description: 'Hàng ngàn sản phẩm số chất lượng - Netflix, Spotify, game accounts, phần mềm bản quyền',
    url: `${SITE_URL}/explore`,
    type: 'website',
    images: [{ url: `${SITE_URL}/images/logobachhoa.png`, width: 512, height: 512, alt: 'BachHoaMMO' }],
  },
  alternates: { canonical: `${SITE_URL}/explore` },
};

/** JSON-LD for explore page */
function ExploreStructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Khám phá sản phẩm số',
    description: 'Danh sách sản phẩm số: tài khoản game, Netflix, Spotify, phần mềm bản quyền',
    url: `${SITE_URL}/explore`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'BachHoaMMO',
      url: SITE_URL,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Khám phá', item: `${SITE_URL}/explore` },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ExploreStructuredData />
      {children}
    </>
  );
}
