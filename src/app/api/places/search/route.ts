import { NextRequest, NextResponse } from 'next/server';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:autocomplete';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('q');
  
  if (!input) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        languageCode: 'ja',
        regionCode: 'JP',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Places Autocomplete Error]', text);
      return NextResponse.json({ error: 'Places API error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Places Autocomplete Exception]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
