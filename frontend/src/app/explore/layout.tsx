import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

export const metadata: Metadata = {
  title: 'Mua tài khoản CapCut, Canva, Netflix, Spotify, ChatGPT giá rẻ | BachHoaMMO',
  description: 'Mua tài khoản CapCut Pro, Canva Pro, Netflix Premium, Spotify Premium, ChatGPT Plus, Adobe Creative Cloud giá rẻ uy tín. Giao hàng tự động 24/7. Bảo hành trọn đời.',
  keywords: [
    'mua tài khoản CapCut',
    'mua tài khoản CapCut Pro',
    'tài khoản CapCut giá rẻ',
    'mua tài khoản Canva Pro',
    'tài khoản Canva giá rẻ',
    'mua tài khoản Netflix',
    'Netflix Premium giá rẻ',
    'mua tài khoản Spotify',
    'Spotify Premium giá rẻ',
    'mua tài khoản ChatGPT',
    'ChatGPT Plus giá rẻ',
    'mua tài khoản Adobe',
    'Adobe Creative Cloud giá rẻ',
    'tài khoản game giá rẻ',
    'mua key game Steam',
    'phần mềm bản quyền',
    'chợ MMO Việt Nam',
    'BachHoaMMO',
  ],
  openGraph: {
    title: 'Mua tài khoản CapCut, Canva, Netflix, Spotify giá rẻ | BachHoaMMO',
    description: 'Mua tài khoản CapCut Pro, Canva Pro, Netflix, Spotify, ChatGPT Plus giá rẻ uy tín. Giao hàng tự động 24/7.',
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
    name: 'Mua tài khoản CapCut, Canva, Netflix, Spotify giá rẻ',
    description: 'Mua tài khoản CapCut Pro, Canva Pro, Netflix Premium, Spotify Premium, ChatGPT Plus giá rẻ uy tín. Giao hàng tự động 24/7. Bảo hành trọn đời.',
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
        { '@type': 'ListItem', position: 2, name: 'Mua tài khoản', item: `${SITE_URL}/explore` },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Sản phẩm nổi bật',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tài khoản CapCut Pro' },
        { '@type': 'ListItem', position: 2, name: 'Tài khoản Canva Pro' },
        { '@type': 'ListItem', position: 3, name: 'Tài khoản Netflix Premium' },
        { '@type': 'ListItem', position: 4, name: 'Tài khoản Spotify Premium' },
        { '@type': 'ListItem', position: 5, name: 'Tài khoản ChatGPT Plus' },
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
