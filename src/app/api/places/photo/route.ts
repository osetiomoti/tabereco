import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Places API (New) の写真URLをサーバーサイドで取得するプロキシ
 * APIキーをフロントに露出させないため、サーバー経由で取得する
 *
 * GET /api/places/photo?name=places/{placeId}/photos/{photoRef}&maxWidth=800
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get('name'); // e.g. "places/ChIJ.../photos/AUacShh..."
  const maxWidth = searchParams.get('maxWidth') || '800';

  if (!photoName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // skipHttpRedirect=true で実際のURL（photoUri）をJSONで返してもらう
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error('[Places Photo Error]', text);
      return NextResponse.json({ error: 'Photo API error' }, { status: res.status });
    }
    const data = await res.json();
    // data.photoUri が実際の画像URL
    return NextResponse.json({ photoUri: data.photoUri });
  } catch (error) {
    console.error('[Places Photo Exception]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
