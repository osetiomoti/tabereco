import type { Metadata } from 'next';
import { Outfit, Noto_Sans_JP } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'モグレコ | 食事記録アプリ',
  description: 'あなたの食の記録を、もっと楽しく。食事の写真・評価・コメントを記録しよう。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${outfit.variable} ${notoSansJP.variable} font-sans bg-[#fcfcfc] text-gray-900 antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
