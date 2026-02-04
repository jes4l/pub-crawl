"use client";
import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, Source, Layer, useMap } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import PubCard from './pubcard';
import { generateCrawlRoute } from '../../app/utils/algorithm';

function MapController({ userLocation }: { userLocation: { lat: number; long: number } }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (map && userLocation) {
      map.flyTo({
        center: [userLocation.long, userLocation.lat],
        zoom: 14,
        essential: true,
        padding: { bottom: 100 }
      });
    }
  }, [userLocation, map]);
  return null;
}

export default function PubMap({
  userLocation,
  pubs,
  crawlType,
  pubCount,
  tier
}: {
  userLocation: { lat: number; long: number };
  pubs: any[];
  crawlType: 'sovereign' | 'conqueror';
  pubCount: number;
  tier: string;
}) {
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [selectedPub, setSelectedPub] = useState<any | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [routedPubs, setRoutedPubs] = useState<any[]>([]);

  useEffect(() => {
    setRouteGeoJSON(null);
    setSelectedPub(null);
    if (pubs.length === 0 || !mapToken) {
      setRoutedPubs([]);
      return;
    }

    const fetchRoute = async () => {
      let filteredPubs = pubs;
      if (tier !== 'Passable') {
        filteredPubs = pubs.filter((p) => p.tier === tier);
      }
      
      const sortedPubs = generateCrawlRoute(userLocation, filteredPubs, crawlType, pubCount);
      setRoutedPubs(sortedPubs);

      if (sortedPubs.length === 0) return;

      const coords = [
        `${userLocation.long},${userLocation.lat}`,
        ...sortedPubs.map((p) => `${p.long},${p.lat}`)
      ].join(';');

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?steps=true&geometries=geojson&access_token=${mapToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.[0]) {
          setRouteGeoJSON({
            type: 'Feature',
            geometry: data.routes[0].geometry
          });
        }
      } catch {}
    };

    fetchRoute();
  }, [pubs, userLocation, mapToken, crawlType, pubCount, tier]);

  return (
    <div className="w-full h-full relative">
      <style>{`
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>

      <Map
        initialViewState={{ longitude: userLocation.long, latitude: userLocation.lat, zoom: 14 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/ezequielm/cij7hk832007dapktzdyaemih"
        mapboxAccessToken={mapToken}
      >
        <MapController userLocation={userLocation} />

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': crawlType === 'conqueror' ? '#991b1b' : '#15803d',
                'line-width': 4,
                'line-opacity': 0.8,
                'line-dasharray': [2, 1]
              }}
            />
          </Source>
        )}

        <Marker longitude={userLocation.long} latitude={userLocation.lat}>
          <div className="bg-[#b91c1c] w-4 h-4 rounded-full border-2 border-[#fef3c7] shadow-xl animate-pulse" />
        </Marker>

        {routedPubs.map((pub, i) => (
          <Marker
            key={i}
            longitude={pub.long}
            latitude={pub.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedPub(pub);
            }}
          >
            <div className="relative group cursor-pointer hover:scale-110 transition-transform duration-200">
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#5d4037] text-[#f4e4bc] text-xs font-bold rounded-full border border-[#f4e4bc] flex items-center justify-center shadow-md z-10">
                {i + 1}
              </div>
              <div className="text-2xl filter drop-shadow-md opacity-90 hover:opacity-100">
                🍺
              </div>
            </div>
          </Marker>
        ))}

        {selectedPub && (
          <Popup
            longitude={selectedPub.long}
            latitude={selectedPub.lat}
            onClose={() => setSelectedPub(null)}
            closeOnClick={false}
            anchor="bottom"
            offset={25}
            closeButton={false}
            className="z-50"
            maxWidth="300px"
          >
            <PubCard pub={selectedPub} onClose={() => setSelectedPub(null)} />
          </Popup>
        )}
      </Map>
    </div>
  );
}