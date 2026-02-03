"use client";
import React, { useState } from 'react';
import PubMap from './components/map';
import Controls from './components/controls';

export default function Home() {
  const [userLocation, setUserLocation] = useState({ lat: 51.498, long: -0.141 }); 
  const [pubs, setPubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [radius, setRadius] = useState(500);
  const [pubCount, setPubCount] = useState(6);
  const [crawlType, setCrawlType] = useState<'sovereign' | 'conqueror'>('sovereign');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performSearch = async (latOverride?: number, longOverride?: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    setPubs([]);

    const lat = latOverride ?? userLocation.lat;
    const long = longOverride ?? userLocation.long;

    try {
      const res = await fetch(`/api/searchpubs?lat=${lat}&long=${long}&radius=${radius}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (!data.pubs?.length) {
        setErrorMsg("No pubs found here. Try a wider radius.");
      } else {
        setPubs(data.pubs);
      }
    } catch {
      setErrorMsg("Failed to connect to search services.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, long: number) => {
    setUserLocation({ lat, long });
    performSearch(lat, long);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationSelect(pos.coords.latitude, pos.coords.longitude), 
      () => setIsLoading(false)
    );
  };

  return (
    <main className="w-screen h-screen relative overflow-hidden bg-[#2c241b]">
      <PubMap 
        userLocation={userLocation} 
        pubs={pubs} 
        crawlType={crawlType} 
        pubCount={pubCount} 
      />
      <Controls 
        onSearch={() => performSearch()}
        onLocationSelect={handleLocationSelect}
        onGPS={handleGPS}
        isLoading={isLoading}
        radius={radius}
        setRadius={setRadius}
        pubCount={pubCount}
        setPubCount={setPubCount}
        crawlType={crawlType}
        setCrawlType={setCrawlType}
        errorMsg={errorMsg}
      />
    </main>
  );
}