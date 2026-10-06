import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  
  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const PLACES_API_URL = `https://places.googleapis.com/v1/places/${placeId}?languageCode=ja`;

  try {
    const res = await fetch(PLACES_API_URL, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,photos',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Places Details Error]', text);
      return NextResponse.json({ error: 'Places details API error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Places Details Exception]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
