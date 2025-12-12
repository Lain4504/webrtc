import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "@livekit/components-styles";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LiveKit E-Learning",
  description: "Japanese E-Learning platform with LiveKit video conferencing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="light">
      <body className={`${inter.variable} ${notoSansJP.variable} antialiased`}>{children}</body>
    </html>
  );
}
