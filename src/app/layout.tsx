import type { Metadata } from 'next';
import { Outfit, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { SWRProvider } from '@/components/SWRProvider';
import { SessionKeepAlive } from '@/components/SessionKeepAlive';
import { ToastProvider } from '@/components/Toast';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { AppTypeProvider, type AppType } from '@/contexts/AppTypeContext';
import { cookies } from 'next/headers';

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

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const appType = cookieStore.get('app_type')?.value === 'tabireco' ? 'tabireco' : 'tabereco';
  const isTabireco = appType === 'tabireco';

  return {
    title: isTabireco ? '旅レコ' : '食べレコ',
    description: isTabireco ? 'あなたの旅の記録を、もっと楽しく。旅の写真・評価・コメントを記録しよう。' : 'あなたの食の記録を、もっと楽しく。食事の写真・評価・コメントを記録しよう。',
    icons: {
      icon: [
        { url: isTabireco ? '/tabireco-192.png' : '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: isTabireco ? '/tabireco-512.png' : '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: isTabireco ? '/tabireco-192.png' : '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: `/api/manifest?appType=${isTabireco ? 'tabireco' : 'tabereco'}`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const storedAppType = cookieStore.get('app_type')?.value;
  const initialAppType: AppType = storedAppType === 'tabireco' ? 'tabireco' : 'tabereco';

  return (
    <html lang="ja" data-app-type={initialAppType} className="overflow-x-hidden">
      <head>
        {/* iOS Safari でのズーム・縮小を確実に防ぐ */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${outfit.variable} ${notoSansJP.variable} font-sans bg-[#fcfcfc] text-gray-900 antialiased overflow-x-hidden min-h-[100dvh] flex flex-col`}>
        <SWRProvider>
          <AppTypeProvider initialAppType={initialAppType}>
            <ToastProvider>
              <SessionKeepAlive />
              <ServiceWorkerRegister />
              {children}
              <BottomNav />
            </ToastProvider>
          </AppTypeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
