interface Point {
  lat: number;
  long: number;
  id?: string;
}

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

export function generateCrawlRoute(start: Point, pubs: Point[]): Point[] {
  if (pubs.length === 0) return [];

  const unvisited = [...pubs];
  const path: Point[] = [];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIndex = -1;
    let minDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = getDistance(current, unvisited[i]);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex !== -1) {
      const nextPub = unvisited[nearestIndex];
      path.push(nextPub);
      current = nextPub;
      unvisited.splice(nearestIndex, 1);
    }
  }

  return path;
}