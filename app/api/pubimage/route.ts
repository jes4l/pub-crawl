import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const lat = searchParams.get('lat');
  const long = searchParams.get('long');

  if (!name || !lat || !long) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const cleanName = name.replace(/-|\bnottingham\b|\bjd wetherspoon\b/gi, '').trim();

  try {
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask': 'places.photos'
      },
      body: JSON.stringify({
        textQuery: `${cleanName} pub bar`,
        locationBias: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(long) },
            radius: 50.0 
          }
        }
      })
    });

    const data = await searchRes.json();

    if (data.places?.[0]?.photos) {
      const photoRef = data.places[0].photos[0].name;
      const redirectUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=400&maxWidthPx=400&skipHttpRedirect=true&key=${process.env.GOOGLE_PLACES_API_KEY}`;
      
      const photoRes = await fetch(redirectUrl);
      const photoData = await photoRes.json();

      return NextResponse.json(
        { imageUrl: photoData.photoUri }, 
        { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' } }
      );
    }

    return NextResponse.json({ imageUrl: null });

  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}