import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bachhoammo.store";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BachHoaMMO - Mua tài khoản CapCut, Canva, Netflix, Spotify giá rẻ uy tín",
    template: "%s | BachHoaMMO",
  },
  description: "Mua tài khoản CapCut Pro, Canva Pro, Netflix Premium, Spotify Premium, ChatGPT Plus, Adobe giá rẻ uy tín. Giao hàng tự động 24/7. Bảo hành trọn đời. Chợ MMO #1 Việt Nam.",
  keywords: [
    "mua tài khoản CapCut",
    "mua tài khoản CapCut Pro",
    "tài khoản CapCut giá rẻ",
    "mua tài khoản Canva",
    "mua tài khoản Canva Pro",
    "tài khoản Canva giá rẻ",
    "mua tài khoản Netflix",
    "Netflix Premium giá rẻ",
    "mua tài khoản Spotify",
    "Spotify Premium giá rẻ",
    "mua tài khoản ChatGPT",
    "ChatGPT Plus giá rẻ",
    "mua tài khoản Adobe",
    "chợ MMO",
    "BachHoaMMO",
    "tài khoản game giá rẻ",
    "mua key game Steam",
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
    title: "BachHoaMMO - Mua tài khoản CapCut, Canva, Netflix, Spotify giá rẻ",
    description: "Mua tài khoản CapCut Pro, Canva Pro, Netflix, Spotify, ChatGPT Plus giá rẻ uy tín. Giao hàng tự động 24/7. Bảo hành trọn đời.",
    images: [{ url: "/images/logobachhoa.png", width: 512, height: 512, alt: "BachHoaMMO Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BachHoaMMO - Mua tài khoản CapCut, Canva, Netflix giá rẻ",
    description: "Mua tài khoản CapCut Pro, Canva Pro, Netflix, Spotify giá rẻ uy tín. Giao hàng tự động 24/7.",
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
      <body className={inter.className}>
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
