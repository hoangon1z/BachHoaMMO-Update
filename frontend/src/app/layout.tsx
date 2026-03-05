import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { MaintenanceNotice } from "@/components/MaintenanceNotice";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bachhoammo.store";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

// Next.js 14+ viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};



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
  // Next.js 14 App Router auto-detects favicon.ico, icon.png, apple-icon.png from app/ folder
  // No manual icon configuration needed!
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Preconnect to API for faster LCP */}
        <link rel="preconnect" href="https://api.bachhoammo.store" />
        <link rel="dns-prefetch" href="https://api.bachhoammo.store" />
        {/* Preconnect to fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Anti-flash: apply dark class BEFORE React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bhmmo_theme');var d=(t==='dark')||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Suppress Telegram WebApp console logs */}
        <Script id="suppress-telegram-logs" strategy="afterInteractive">
          {`(function(){var o=console.log;console.log=function(){if(arguments[0]&&typeof arguments[0]==='string'&&arguments[0].includes('[Telegram.WebView]'))return;o.apply(console,arguments)};})();`}
        </Script>
        {/* Telegram Mini App SDK */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        <Providers>
          <MaintenanceNotice />
          {children}
        </Providers>
      </body>
    </html>
  );
}
