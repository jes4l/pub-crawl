export interface Point {
  lat: number;
  long: number;
  crimeCount?: number;
  id?: string;
  name?: string;
}

function getDistance(p1: Point, p2: Point) {
  const R = 6371e3;
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

  if (type === 'sovereign') {
    return dist + crime * 500;
  }

  if (type === 'conqueror') {
    return dist - crime * 200;
  }

  return dist;
}

export function generateCrawlRoute(
  start: Point,
  pubs: Point[],
  type: 'sovereign' | 'conqueror',
  limit: number
): Point[] {
  if (pubs.length === 0) return [];

  const unvisited = pubs.filter((p) => p.lat && p.long);
  const path: Point[] = [];
  let current = start;

  const targetCount = Math.min(limit, unvisited.length);

  while (path.length < targetCount && unvisited.length > 0) {
    const scoredPubs = unvisited.map((pub, index) => ({
      index,
      pub,
      score: calculateCost(current, pub, type)
    }));

    scoredPubs.sort((a, b) => a.score - b.score);

    const poolSize = Math.min(3, scoredPubs.length);
    const randomIndex = Math.floor(Math.random() * poolSize);

    const selected = scoredPubs[randomIndex];

    if (selected) {
      path.push(selected.pub);
      current = selected.pub;

      const removeIndex = unvisited.indexOf(selected.pub);
      if (removeIndex > -1) {
        unvisited.splice(removeIndex, 1);
      }
    } else {
      break;
    }
  }

  return path;
}