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
        zoom: 15,
        essential: true,
        padding: { bottom: 150 } 
      });
    }
  }, [userLocation, map]);
  return null;
}

export default function PubMap({ 
  userLocation, pubs, crawlType, pubCount 
}: { 
  userLocation: { lat: number; long: number }, 
  pubs: any[], 
  crawlType: 'sovereign' | 'conqueror', 
  pubCount: number 
}) {
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [selectedPub, setSelectedPub] = useState<any | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [routedPubs, setRoutedPubs] = useState<any[]>([]);

  useEffect(() => {
    setRouteGeoJSON(null);
    setSelectedPub(null);
    if (pubs.length === 0 || !mapToken) return;

    const fetchRoute = async () => {
      const sortedPubs = generateCrawlRoute(userLocation, pubs, crawlType, pubCount);
      setRoutedPubs(sortedPubs);
      
      const coords = [`${userLocation.long},${userLocation.lat}`, ...sortedPubs.map(p => `${p.long},${p.lat}`)].join(';');

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
  }, [pubs, userLocation, mapToken, crawlType, pubCount]);

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
                'line-color': crawlType === 'conqueror' ? '#991b1b' : '#d97706',
                'line-width': 5,
                'line-opacity': 0.7,
                'line-dasharray': [1, 0]
              }}
            />
          </Source>
        )}

        <Marker longitude={userLocation.long} latitude={userLocation.lat}>
          <div className="bg-[#b91c1c] w-5 h-5 rounded-full border-2 border-[#fef3c7] shadow-xl animate-bounce" />
        </Marker>

        {routedPubs.map((pub, i) => (
          <Marker 
            key={i} 
            longitude={pub.long} 
            latitude={pub.lat} 
            onClick={e => { e.originalEvent.stopPropagation(); setSelectedPub(pub); }}
          >
            <div className="text-3xl cursor-pointer hover:scale-125 transition-transform filter drop-shadow-lg opacity-90 hover:opacity-100">
              <span className="absolute -top-3 -right-3 bg-[#5d4037] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[#f4e4bc] z-10">
                {i + 1}
              </span>
              🍺
            </div>
          </Marker>
        ))}

        {selectedPub && (
          <Popup 
            longitude={selectedPub.long} latitude={selectedPub.lat} 
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