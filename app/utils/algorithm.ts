export interface Point {
  lat: number;
  long: number;
  crimeCount?: number;
  crimeDensity?: number; 
  tierDensity?: number;
  elevation?: number;
  id?: string;
  name?: string;
  tier?: string;
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

export function generateCrawlRoute(
  start: Point,
  pubs: Point[],
  type: 'sovereign' | 'conqueror',
  limit: number,
  isLegDay: boolean,
  targetTier: string
): Point[] {
  if (pubs.length === 0) return [];
  const validPubs = pubs.filter((p) => p.lat && p.long);
  if (validPubs.length === 0) return [];

  const tierMatchingPubs = validPubs.filter(p => p.tier === targetTier);
  const anchorPool = tierMatchingPubs.length > 0 ? tierMatchingPubs : validPubs;

  const scoredAnchors = anchorPool.map((p) => {
    let score = 0;
    score += (p.tierDensity || 1) * 100;

    const crimeFactor = (p.crimeDensity || 0);
    if (type === 'conqueror') {
        score += crimeFactor * 10; 
    } else {
        score -= crimeFactor * 20; 
    }

    const distKm = getDistance(start, p) / 1000;
    score -= distKm * 100;

    return { pub: p, score };
  });

  scoredAnchors.sort((a, b) => b.score - a.score);
  const bestAnchor = scoredAnchors[0].pub;
  const clusterCandidates = validPubs.map((p) => {
      const distMeters = getDistance(bestAnchor, p);
      
      let selectionCost = distMeters; 

      if (p.tier !== targetTier) {
          selectionCost += 2000;
      }

      if (distMeters > 1200) {
          selectionCost += 3000;
      }

      const crimeCount = p.crimeCount || 0;
      if (type === 'conqueror') {
          selectionCost -= Math.min(crimeCount * 40, 500); 
      } else {
          selectionCost += Math.min(crimeCount * 250, 1000); 
      }

      return { pub: p, cost: selectionCost };
  });

  clusterCandidates.sort((a, b) => a.cost - b.cost);

  const selectedPubs = clusterCandidates.slice(0, limit).map((c) => c.pub);

  if (isLegDay) {
    return selectedPubs.sort((a, b) => (b.elevation || 0) - (a.elevation || 0));
  } else {
    let current = selectedPubs.reduce((prev, curr) =>
        getDistance(start, prev) < getDistance(start, curr) ? prev : curr
    );

    const route: Point[] = [current];
    const unvisited = selectedPubs.filter((p) => p !== current);

    while (unvisited.length > 0) {
      unvisited.sort((a, b) => getDistance(current, a) - getDistance(current, b));
      const next = unvisited.shift()!;
      route.push(next);
      current = next;
    }

    return route;
  }
}