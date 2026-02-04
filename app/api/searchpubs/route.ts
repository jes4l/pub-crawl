import { NextResponse } from 'next/server';

const fetchWithTimeout = async (resource: string, options = {}, timeout = 1500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function determineTier(priceLevel: string, rating: number, userRatingCount: number) {
  if (priceLevel === 'PRICE_LEVEL_EXPENSIVE' || priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE')
    return 'Aristocrat';
  if (rating >= 4.5 && userRatingCount > 100) return 'Aristocrat';

  if (priceLevel === 'PRICE_LEVEL_INEXPENSIVE') return 'Bottom of the Barrel';
  if (rating < 4.2) return 'Bottom of the Barrel';

  return 'Passable';
}

async function fetchGoogleNearby(lat: number, long: number, radius: number, types: string[]) {
  if (!process.env.GOOGLE_PLACES_API_KEY) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask':
          'places.name,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.priceLevel'
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: 20,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: long }, radius }
        }
      })
    });
    const data = await res.json();
    return data.places || [];
  } catch {
    return [];
  }
}

async function fetchGoogleText(lat: number, long: number, radius: number, query: string) {
  if (!process.env.GOOGLE_PLACES_API_KEY) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask':
          'places.name,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.priceLevel'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: { center: { latitude: lat, longitude: long }, radius }
        }
      })
    });
    const data = await res.json();
    return data.places || [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const long = parseFloat(searchParams.get('long') || '0');
  const radiusMeters = parseFloat(searchParams.get('radius') || '1000');

  if (!lat || !long) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  try {
    const [pubs, bars, clubs, attractions, craftBeer, cocktails, gastropubs] =
      await Promise.all([
        fetchGoogleNearby(lat, long, radiusMeters, ['pub']),
        fetchGoogleNearby(lat, long, radiusMeters, ['bar']),
        fetchGoogleNearby(lat, long, radiusMeters, ['night_club']),
        fetchGoogleNearby(lat, long, radiusMeters, ['tourist_attraction', 'bowling_alley']),
        fetchGoogleText(lat, long, radiusMeters, 'Craft Beer'),
        fetchGoogleText(lat, long, radiusMeters, 'Cocktail Bar'),
        fetchGoogleText(lat, long, radiusMeters, 'Gastropub')
      ]);

    const rawPlaces = [
      ...pubs,
      ...bars,
      ...clubs,
      ...attractions,
      ...craftBeer,
      ...cocktails,
      ...gastropubs
    ];

    const uniquePlaces = new Map();
    rawPlaces.forEach((p: any) => {
      if (p?.name && !uniquePlaces.has(p.name)) {
        uniquePlaces.set(p.name, p);
      }
    });

    const validPlaces = Array.from(uniquePlaces.values()).filter((place: any) => {
      const types = place.types || [];
      const primary = place.primaryType || '';
      const name = (place.displayName?.text || '').toLowerCase();

      const bannedTags = [
        'lodging','hotel','school','university','student_union',
        'gym','spa','museum','art_gallery','place_of_worship',
        'shopping_mall','clothing_store','furniture_store','electronics_store',
        'library','hospital','movie_theater','concert_hall',
        'performing_arts_theater','auditorium',
        'cafe','coffee_shop','tea_house','ice_cream_shop','steak_house'
      ];

      const bannedCuisines = [
        'indian_restaurant','sushi_restaurant','chinese_restaurant',
        'fast_food_restaurant','brazilian_restaurant'
      ];

      if (types.some((t: string) => bannedTags.includes(t))) return false;
      if (types.some((t: string) => bannedCuisines.includes(t))) return false;

      if (primary.includes('restaurant')) {
        const isProperDrinkingSpot = types.includes('pub') || types.includes('night_club');
        const nameIsGastropub =
          name.includes('gastropub') || name.includes('tavern') || name.includes('inn');
        if (!isProperDrinkingSpot && !nameIsGastropub) return false;
      }

      if (types.includes('pizza_restaurant')) {
        if (!types.includes('bar') && !types.includes('pub')) return false;
      }

      if (primary === 'night_club') {
        const isHybrid =
          types.includes('restaurant') || types.includes('food') || types.includes('pub');
        if (!isHybrid) return false;
      }

      return types.includes('bar') || types.includes('pub') || types.includes('night_club');
    });

    const processedPubs = await Promise.all(
      validPlaces.map(async (place: any) => {
        const pLat = place.location.latitude;
        const pLong = place.location.longitude;
        let crimeCount = 0;
        const crimeBreakdown: Record<string, number> = {};

        try {
          const date = new Date();
          date.setMonth(date.getMonth() - 2);
          const dateStr = date.toISOString().slice(0, 7);
          const crimeRes = await fetchWithTimeout(
            `https://data.police.uk/api/crimes-street/all-crime?lat=${pLat}&lng=${pLong}&date=${dateStr}`,
            {},
            1000
          );

          if (crimeRes.ok) {
            const crimes = await crimeRes.json();
            crimes.forEach((crime: any) => {
              const dist = getDistanceFromLatLonInKm(
                pLat,
                pLong,
                parseFloat(crime.location.latitude),
                parseFloat(crime.location.longitude)
              );
              if (dist <= 0.05) {
                crimeCount++;
                const cat = crime.category.replace(/-/g, ' ');
                crimeBreakdown[cat] = (crimeBreakdown[cat] || 0) + 1;
              }
            });
          }
        } catch {}

        const tier = determineTier(
          place.priceLevel,
          place.rating || 0,
          place.userRatingCount || 0
        );

        return {
          name: place.displayName.text,
          address: place.formattedAddress,
          lat: pLat,
          long: pLong,
          category: (place.primaryType || 'Venue').replace(/_/g, ' ').toUpperCase(),
          rating: place.rating || 0,
          tier,
          crimeCount,
          crimeBreakdown
        };
      })
    );

    processedPubs.sort((a, b) => {
      const distA = getDistanceFromLatLonInKm(lat, long, a.lat, a.long);
      const distB = getDistanceFromLatLonInKm(lat, long, b.lat, b.long);
      return distA - distB;
    });

    return NextResponse.json({ pubs: processedPubs });
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}