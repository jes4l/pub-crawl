import { NextResponse } from 'next/server';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.primaryType,places.types'
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

    const validPlaces = data.places.filter((place: any) => {
      const name = place.displayName.text.toLowerCase();
      const types = place.types || []; 
      const primaryType = place.primaryType || "";

      // 1. HARD KILL: The primary focus is food/coffee, not drinking.
      // (This immediately kills Vietnamese restaurants, Bill's, and Cafes)
      if (primaryType === 'restaurant' || primaryType === 'cafe' || primaryType === 'coffee_shop') return false;

      // 2. HARD KILL: Lodging and Cinemas 
      const hasBadTag = types.some((type: string) => 
        ['lodging', 'hotel', 'movie_theater', 'spa', 'gym'].includes(type)
      );
      if (hasBadTag) return false;

      // 3. NAME BLOCK: Cinemas, un-tagged hotels, and obvious food words.
      // (Added 'vietnamese', 'thai', 'chinese', 'indian', 'sushi' just to be absolutely sure)
      const isBadName = /hotel|hostel|guesthouse|b&b|premier inn|cinema|odeon|cineworld|vue|vietnamese|thai|chinese|indian|sushi|bistro|kitchen|grill|pizzeria/i.test(name);
      if (isBadName) return false;

      return true; // If it survived all that, it's a legitimate Pub/Bar.
    });

    const pubsWithCrime = await Promise.all(validPlaces.map(async (place: any) => {
      const pLat = place.location.latitude;
      const pLong = place.location.longitude;
      let crimeCount = 0;
      const crimeBreakdown: Record<string, number> = {};

      try {
        const date = new Date();
        date.setMonth(date.getMonth() - 2);
        const dateStr = date.toISOString().slice(0, 7);

        const crimeRes = await fetch(`https://data.police.uk/api/crimes-street/all-crime?lat=${pLat}&lng=${pLong}&date=${dateStr}`);
        if (crimeRes.ok) {
          const crimes = await crimeRes.json();
          const nearbyCrimes = crimes.filter((crime: any) => {
            if (!crime.location || !crime.location.latitude) return false;
            const dist = getDistanceFromLatLonInKm(pLat, pLong, parseFloat(crime.location.latitude), parseFloat(crime.location.longitude));
            return dist <= 0.05; 
          });

          crimeCount = nearbyCrimes.length;
          nearbyCrimes.forEach((crime: any) => {
            const cat = crime.category.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            crimeBreakdown[cat] = (crimeBreakdown[cat] || 0) + 1;
          });
        }
      } catch {}

      return {
        name: place.displayName.text,
        address: place.formattedAddress,
        lat: pLat,
        long: pLong,
        category: (place.primaryType || "Pub").replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        crimeCount,
        crimeBreakdown
      };
    }));

    return NextResponse.json({ pubs: pubsWithCrime });

  } catch {
    return NextResponse.json({ pubs: [] }, { status: 500 });
  }
}