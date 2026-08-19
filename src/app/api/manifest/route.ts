import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const urlParams = request.nextUrl.searchParams;
  const paramType = urlParams.get('appType');
  
  const cookieStore = await cookies();
  const cookieType = cookieStore.get('app_type')?.value;
  
  const appType = paramType || cookieType || 'tabereco';
  const isTabireco = appType === 'tabireco';

  return NextResponse.json({
    name: isTabireco ? '旅レコ' : '食べレコ',
    short_name: isTabireco ? '旅レコ' : '食べレコ',
    description: isTabireco ? 'あなたの旅の記録を、もっと楽しく。' : 'あなたの食の記録を、もっと楽しく。',
    start_url: isTabireco ? '/posts?app_type=tabireco' : '/posts',
    display: 'standalone',
    background_color: '#fcfcfc',
    theme_color: '#fcfcfc',
    icons: [
      {
        src: isTabireco ? '/tabireco-192.png' : '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: isTabireco ? '/tabireco-512.png' : '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  });
}
