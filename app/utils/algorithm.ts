export interface Point {
  lat: number;
  long: number;
  crimeCount?: number;
  id?: string;
}

const WEIGHTS = {
  distance: 15.0, 
  crime: 0.1      
};

function getDistance(p1: Point, p2: Point) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.long - p1.long) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function calculateCost(current: Point, next: Point, type: 'sovereign' | 'conqueror') {
  const dist = getDistance(current, next);
  const crime = next.crimeCount || 0;
  
  const distanceCost = dist * WEIGHTS.distance;
  
  const crimeModifier = type === 'conqueror' ? -1 : 1;
  const crimeCost = crime * WEIGHTS.crime * crimeModifier;

  return distanceCost + crimeCost;
}

export function generateCrawlRoute(
  start: Point, 
  pubs: Point[], 
  type: 'sovereign' | 'conqueror', 
  limit: number
): Point[] {
  if (pubs.length === 0) return [];

  const unvisited = [...pubs];
  const path: Point[] = [];
  let current = start;

  const targetCount = Math.min(limit, pubs.length);

  while (path.length < targetCount && unvisited.length > 0) {
    let bestIndex = -1;
    let minCost = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const cost = calculateCost(current, unvisited[i], type);
      if (cost < minCost) {
        minCost = cost;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1) {
      const nextPub = unvisited[bestIndex];
      path.push(nextPub);
      current = nextPub;
      unvisited.splice(bestIndex, 1);
    } else {
      break;
    }
  }

  return path;
}