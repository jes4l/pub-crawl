"use client";
import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, Source, Layer, useMap } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import PubCard from './pubcard';
import { generateCrawlRoute } from '../utils/algorithm';

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

export default function PubMap({ userLocation, pubs }: { userLocation: { lat: number; long: number }, pubs: any[] }) {
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [selectedPub, setSelectedPub] = useState<any | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  useEffect(() => {
    setRouteGeoJSON(null);

    if (pubs.length === 0 || !mapToken) {
        return;
    }

    const fetchRoute = async () => {
        const sortedPubs = generateCrawlRoute(userLocation, pubs);
        const coords = [
            `${userLocation.long},${userLocation.lat}`,
            ...sortedPubs.map(p => `${p.long},${p.lat}`)
        ].join(';');

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?steps=true&geometries=geojson&access_token=${mapToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.routes && data.routes[0]) {
                setRouteGeoJSON({
                    type: 'Feature',
                    properties: {},
                    geometry: data.routes[0].geometry
                });
            }
        } catch (e) {
            console.error("Route error:", e);
        }
    };

    fetchRoute();
  }, [pubs, userLocation, mapToken]);

  return (
    <div className="w-full h-full">
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
                        'line-color': '#d97706',
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
        {pubs.map((pub, i) => (
          <Marker 
            key={i} 
            longitude={pub.long} 
            latitude={pub.lat} 
            onClick={e => { e.originalEvent.stopPropagation(); setSelectedPub(pub); }}
          >
            <div className="text-3xl cursor-pointer hover:scale-125 transition-transform filter drop-shadow-lg opacity-90 hover:opacity-100">🍺</div>
          </Marker>
        ))}

        {selectedPub && (
          <Popup 
            longitude={selectedPub.long} latitude={selectedPub.lat} 
            onClose={() => setSelectedPub(null)} closeOnClick={false} anchor="bottom" offset={20}
            className="text-black"
          >
            <PubCard pub={selectedPub} />
          </Popup>
        )}
      </Map>
    </div>
  );
}