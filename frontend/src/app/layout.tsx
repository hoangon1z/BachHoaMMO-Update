import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bachhoammo.store";

const beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BachHoaMMO - Chợ MMO mua bán tài khoản game uy tín",
    template: "%s | BachHoaMMO",
  },
  description: "Nền tảng mua bán tài khoản game, vật phẩm game, dịch vụ MMO uy tín hàng đầu Việt Nam. Mua bán Netflix, Spotify, game account an toàn, bảo hành.",
  keywords: [
    "mua bán tài khoản game",
    "chợ MMO",
    "tài khoản game giá rẻ",
    "BachHoaMMO",
    "mua tài khoản Netflix",
    "tài khoản Spotify",
    "game account",
    "MMO Việt Nam",
  ],
  authors: [{ name: "BachHoaMMO", url: SITE_URL }],
  creator: "BachHoaMMO",
  publisher: "BachHoaMMO",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: "BachHoaMMO",
    title: "BachHoaMMO - Chợ MMO mua bán tài khoản game uy tín",
    description: "Nền tảng mua bán tài khoản game, vật phẩm game, dịch vụ MMO uy tín hàng đầu Việt Nam.",
    images: [{ url: "/images/logobachhoa.png", width: 512, height: 512, alt: "BachHoaMMO Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BachHoaMMO - Chợ MMO mua bán tài khoản game",
    description: "Nền tảng mua bán tài khoản game, vật phẩm game uy tín hàng đầu Việt Nam.",
    images: ["/images/logobachhoa.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    // Thêm sau khi đăng ký Google Search Console (ví dụ: google: "code_xxx")
    // google: "your-google-verification-code",
  },
  alternates: { canonical: SITE_URL },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/images/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/images/favicon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/images/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        {/* Preconnect to API for faster LCP */}
        <link rel="preconnect" href="https://api.bachhoammo.store" />
        <link rel="dns-prefetch" href="https://api.bachhoammo.store" />
        {/* Preconnect to fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={beVietnamPro.className}>
        {/* Telegram Mini App SDK */}
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
