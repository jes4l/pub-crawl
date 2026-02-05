import { NextResponse } from 'next/server';

const fetchWithTimeout = async (resource: string, options = {}, timeout = 6000) => {
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
  if (rating > 4.6 && userRatingCount > 100) return 'Aristocrat';

  if (priceLevel === 'PRICE_LEVEL_INEXPENSIVE') return 'Bottom of the Barrel';
  if (rating < 3.8) return 'Bottom of the Barrel';

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
          'places.name,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri'
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
          'places.name,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri'
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

function generatePolygon(lat: number, long: number, radiusMeters: number) {
  const r = radiusMeters * 1.3; 
  const latOffset = r / 111320; 
  const longOffset = r / (40075000 * Math.cos((lat * Math.PI) / 180) / 360);

  const p1 = `${lat + latOffset},${long - longOffset}`;
  const p2 = `${lat + latOffset},${long + longOffset}`;
  const p3 = `${lat - latOffset},${long + longOffset}`;
  const p4 = `${lat - latOffset},${long - longOffset}`;

  return `${p1}:${p2}:${p3}:${p4}`;
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
        const name = (place.displayName?.text || '').toLowerCase();
        const isProperDrinkingSpot = types.includes('pub') || types.includes('night_club');
        const nameIsGastropub = name.includes('gastropub') || name.includes('tavern') || name.includes('inn');
        if (!isProperDrinkingSpot && !nameIsGastropub) return false;
      }

      if (types.includes('pizza_restaurant')) {
        if (!types.includes('bar') && !types.includes('pub')) return false;
      }
      return types.includes('bar') || types.includes('pub') || types.includes('night_club');
    });

    const poly = generatePolygon(lat, long, radiusMeters);
    let allAreaCrimes: any[] = [];
    
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        dates.push(d.toISOString().slice(0, 7));
    }

    try {
        const crimeResponses = await Promise.all(
            dates.map(dateStr => 
                fetchWithTimeout(
                    `https://data.police.uk/api/crimes-street/all-crime?poly=${poly}&date=${dateStr}`, 
                    {}, 
                    5000
                ).then(res => res.ok ? res.json() : [])
                 .catch(() => [])
            )
        );
        allAreaCrimes = crimeResponses.flat();
    } catch (e) {
        console.error("Crime Fetch Failed", e);
    }

    const pubsWithCrime = validPlaces.map((place: any) => {
        const pLat = place.location.latitude;
        const pLong = place.location.longitude;
        
        let crimeCount = 0;
        const crimeBreakdown: Record<string, number> = {};

        allAreaCrimes.forEach((crime: any) => {
            const cLat = parseFloat(crime.location.latitude);
            const cLong = parseFloat(crime.location.longitude);
            const dist = getDistanceFromLatLonInKm(pLat, pLong, cLat, cLong);
            
            if (dist <= 0.05) { 
                crimeCount++;
                const cat = crime.category.replace(/-/g, ' ');
                crimeBreakdown[cat] = (crimeBreakdown[cat] || 0) + 1;
            }
        });

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
          crimeBreakdown,
          website: place.websiteUri || place.googleMapsUri || `https://www.google.com/search?q=${encodeURIComponent(place.displayName.text + ' pub')}`
        };
    });

    const lats = pubsWithCrime.map(p => p.lat).join(',');
    const longs = pubsWithCrime.map(p => p.long).join(',');
    let elevations: number[] = [];
    try {
        const elevationRes = await fetchWithTimeout(
            `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${longs}`,
            {}, 3000
        );
        if (elevationRes.ok) {
            const data = await elevationRes.json();
            elevations = data.elevation || [];
        }
    } catch {}

    const finalPubs = pubsWithCrime.map((pub, index) => {
        let crimeDensity = pub.crimeCount;
        let tierDensity = 1; 

        pubsWithCrime.forEach((otherPub) => {
            if (pub.name !== otherPub.name) {
                const dist = getDistanceFromLatLonInKm(pub.lat, pub.long, otherPub.lat, otherPub.long);
                
                if (dist <= 0.6) {
                    crimeDensity += otherPub.crimeCount;
                    if (otherPub.tier === pub.tier) {
                        tierDensity += 1;
                    }
                }
            }
        });

        return {
            ...pub,
            elevation: elevations[index] || 0,
            crimeDensity,
            tierDensity
        };
    });

    finalPubs.sort((a, b) => {
      const distA = getDistanceFromLatLonInKm(lat, long, a.lat, a.long);
      const distB = getDistanceFromLatLonInKm(lat, long, b.lat, b.long);
      return distA - distB;
    });

    return NextResponse.json({ pubs: finalPubs });
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}