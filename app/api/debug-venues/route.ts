import { NextResponse } from 'next/server';

// The "Hit List" of venues you want to analyze
const TARGET_VENUES = [
  // THE PROBLEM CHILD
  { name: "Flight Club (Nottingham)", query: "Flight Club Darts Nottingham", fallback: "Flight Club Victoria London" },
  
  // THE REST OF THE LIST
  { name: "BrewDog", query: "BrewDog Nottingham" },
  { name: "Mooch", query: "Mooch Bar Nottingham" }, 
  { name: "Pit and Pendulum", query: "Pit and Pendulum Nottingham" },
  { name: "Ye Olde Trip to Jerusalem", query: "Ye Olde Trip to Jerusalem Nottingham" },
  { name: "Revolución de Cuba", query: "Revolucion de Cuba Nottingham" }, 
  { name: "The Bodega", query: "The Bodega Social Club Nottingham" },
  { name: "Coco Tang", query: "House of Coco Tang Nottingham" },
  { name: "The Hockley Arts Club", query: "The Hockley Arts Club Nottingham" },
  { name: "The Organ Grinder", query: "The Organ Grinder Nottingham" },
  { name: "Mojo", query: "Mojo Nottingham" },
  { name: "The White Hart", query: "The White Hart Lenton" },
  { name: "Three Wheatsheaves", query: "Three Wheatsheaves Nottingham" },
  { name: "Rose and Crown", query: "Rose and Crown Lenton Nottingham" },
  { name: "The Blind Rabbit", query: "The Blind Rabbit Nottingham" },
  { name: "Penny Lane", query: "Penny Lane Nottingham" },
  { name: "Pepper Rocks", query: "Pepper Rocks Nottingham" },
  { name: "Bunk", query: "Bunk Cocktails Nottingham" },
  { name: "Industry", query: "Industry Nottingham" },
  { name: "The Roebuck (Wetherspoons)", query: "The Roebuck Inn Wetherspoon Nottingham" },
  { name: "Six Barrel Drafthouse", query: "Six Barrel Drafthouse Nottingham" }
];

export async function GET() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
  }

  console.log("\n🕵️ STARTING DEEP FORENSIC SCAN... Check Terminal for DNA results.\n");
  
  const results = [];

  for (const venue of TARGET_VENUES) {
    try {
      // 1. Search for the venue
      let placeData = await fetchPlace(venue.query);
      
      // 2. Fallback logic for Flight Club if Nottingham doesn't show
      if (!placeData && venue.fallback) {
        console.log(`⚠️  Could not find ${venue.name} in Nottingham. Trying fallback: ${venue.fallback}`);
        placeData = await fetchPlace(venue.fallback);
      }

      if (placeData) {
        console.log(`\n===============================================================`);
        console.log(`🍺 VENUE: ${venue.name.toUpperCase()}`);
        console.log(`   Official Name:  "${placeData.displayName?.text}"`);
        console.log(`   Primary Type:   "${placeData.primaryType}"`);
        console.log(`   All Tags:       ${JSON.stringify(placeData.types)}`);
        
        // This is the KEY - checking the written description for keywords like "darts" or "bar"
        const summary = placeData.editorialSummary?.text || "No description available";
        console.log(`   Description:    "${summary}"`);

        results.push({
          name: venue.name,
          primary: placeData.primaryType,
          types: placeData.types,
          summary: summary
        });
      } else {
        console.log(`\n❌ MISSING: ${venue.name} (Google returned no results)`);
      }

    } catch (error) {
      console.error(`Error fetching ${venue.name}`, error);
    }
  }

  console.log("\n✅ SCAN COMPLETE.");
  return NextResponse.json({ 
    message: "Scan complete. Check your server terminal/console for the raw data dump.",
    data: results 
  });
}

// Helper function to fetch data
async function fetchPlace(textQuery: string) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY as string,
      // We request editorialSummary to see if it mentions "darts" or "cocktails"
      'X-Goog-FieldMask': 'places.displayName,places.primaryType,places.types,places.editorialSummary'
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1 })
  });
  
  const data = await res.json();
  return data.places ? data.places[0] : null;
}