import type { Metadata } from 'next';
import { Outfit, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { SWRProvider } from '@/components/SWRProvider';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto',
  display: 'swap',
  weight: ['300', '400', '500', '700'],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#fcfcfc',
};

export const metadata: Metadata = {
  title: '食べレコ',
  description: 'あなたの食の記録を、もっと楽しく。食事の写真・評価・コメントを記録しよう。',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="overflow-x-hidden">
      <head>
        {/* iOS Safari でのズーム・縮小を確実に防ぐ */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${outfit.variable} ${notoSansJP.variable} font-sans bg-[#fcfcfc] text-gray-900 antialiased overflow-x-hidden min-h-[100dvh] flex flex-col`}>
        <SWRProvider>
          {children}
          <BottomNav />
        </SWRProvider>
      </body>
    </html>
  );
}
