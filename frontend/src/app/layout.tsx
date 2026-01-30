import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BachHoaMMO - Chợ MMO mua bán tài khoản game",
  description: "Nền tảng mua bán tài khoản game, vật phẩm, dịch vụ game uy tín hàng đầu Việt Nam",
  icons: {
    icon: [
      { url: "/images/bachhoa.png", sizes: "any" },
      { url: "/images/bachhoa.png", type: "image/png", sizes: "32x32" },
      { url: "/images/bachhoa.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/images/bachhoa.png",
    apple: [
      { url: "/images/bachhoa.png", sizes: "180x180" },
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
      <body className={beVietnamPro.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
