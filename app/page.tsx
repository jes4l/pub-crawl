"use client";
import React, { useState } from 'react';
import PubMap from './components/map';
import Controls from './components/controls';

export default function Home() {
  const [userLocation, setUserLocation] = useState({ lat: 51.498, long: -0.141 }); 
  const [pubs, setPubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [radius, setRadius] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  const performSearch = async (latOverride?: number, longOverride?: number) => {
    if (!mapToken) return;
    
    setPubs([]); 
    setIsLoading(true);
    setErrorMsg(null);

    const searchLat = latOverride ?? userLocation.lat;
    const searchLong = longOverride ?? userLocation.long;

    try {
      const sessionToken = "search-" + Math.random();
      const queries = ['pub', 'bar', 'brewery']; 
      const fetchSuggestions = async (q: string) => {
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${q}&language=en&proximity=${searchLong},${searchLat}&limit=10&country=gb&types=poi&access_token=${mapToken}&session_token=${sessionToken}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.suggestions || [];
      };

      const resultsArray = await Promise.all(queries.map(q => fetchSuggestions(q)));
      const allSuggestions = resultsArray.flat();

      if (allSuggestions.length === 0) {
        setErrorMsg("No pubs found here. Try a wider radius.");
        setIsLoading(false);
        return;
      }

      const uniqueMap = new Map();
      allSuggestions.forEach((s: any) => {
        if (!uniqueMap.has(s.mapbox_id)) uniqueMap.set(s.mapbox_id, s);
      });
      const uniqueSuggestions = Array.from(uniqueMap.values());
      const detailedPromises = uniqueSuggestions.map(async (s: any) => {
        try {
            const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}?access_token=${mapToken}&session_token=${sessionToken}`;
            const res = await fetch(retrieveUrl);
            const data = await res.json();
            const feature = data.features?.[0];

            if (!feature) return null;
            const toRad = (v: number) => (v * Math.PI) / 180;
            const R = 3958.8; 
            const dLat = toRad(feature.geometry.coordinates[1] - searchLat);
            const dLon = toRad(feature.geometry.coordinates[0] - searchLong);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(toRad(searchLat)) * Math.cos(toRad(feature.geometry.coordinates[1])) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const distance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            if (distance > radius) return null; 

            return {
                name: s.name,
                address: s.full_address || s.place_formatted,
                long: feature.geometry.coordinates[0],
                lat: feature.geometry.coordinates[1],
                category: "Pub"
            };
        } catch (e) { return null; }
      });

      const detailedResults = await Promise.all(detailedPromises);
      const validPubs = detailedResults.filter(p => p !== null);

      if (validPubs.length === 0) {
        setErrorMsg("Pubs found, but they are outside your radius.");
      }

      setPubs(validPubs);

    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to connect to map services.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, long: number, name: string) => {
    setUserLocation({ lat, long });
    performSearch(lat, long);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, long: longitude });
        performSearch(latitude, longitude);
    }, () => setIsLoading(false));
  };

  return (
    <main className="w-screen h-screen relative overflow-hidden bg-[#2c241b]">
      <PubMap userLocation={userLocation} pubs={pubs} />
      
      <Controls 
        onSearch={() => performSearch()}
        onLocationSelect={handleLocationSelect}
        onGPS={handleGPS}
        isLoading={isLoading}
        radius={radius}
        setRadius={setRadius}
        errorMsg={errorMsg}
        mapToken={mapToken}
      />
    </main>
  );
}