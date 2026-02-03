import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const long = parseFloat(searchParams.get('long') || '0');
  const radiusMeters = parseFloat(searchParams.get('radius') || '500');

  if (!lat || !long) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const safeRadius = Math.min(Math.max(radiusMeters, 100), 50000);

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.primaryType'
      },
      body: JSON.stringify({
        includedTypes: ["bar", "pub", "night_club", "wine_bar"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: long },
            radius: safeRadius
          }
        }
      })
    });

    const data = await res.json();

    if (!data.places) return NextResponse.json({ pubs: [] });

    const formattedPubs = data.places.map((place: any) => ({
      name: place.displayName.text,
      address: place.formattedAddress,
      lat: place.location.latitude,
      long: place.location.longitude,
      category: (place.primaryType || "Pub").replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    }));

    return NextResponse.json({ pubs: formattedPubs });

  } catch {
    return NextResponse.json({ pubs: [] }, { status: 500 });
  }
}