"use client";
import React, { useState, useEffect } from 'react';

interface MenuProps {
  radiusMiles: number;
  setRadiusMiles: (value: number) => void;
  handleSearch: (address?: string) => void;
  pubsLength: number;
  setMenuOpen: (open: boolean) => void;
  setUserLocation: (loc: { lat: number; long: number } | null) => void;
  userLocation: { lat: number; long: number } | null;
  errorMsg: string | null;
  disabled: boolean;
  isLoading: boolean;
}

export default function Menu({
  radiusMiles,
  setRadiusMiles,
  handleSearch,
  pubsLength,
  setMenuOpen,
  setUserLocation,
  userLocation,
  errorMsg,
  disabled,
  isLoading,
}: MenuProps) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; long: number }[]>([]);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (address.length < 3) {
        setSuggestions([]);
        return;
      }

      const sessionToken = crypto.randomUUID?.() || Math.random().toString(36).substring(2);

      try {
        const encoded = encodeURIComponent(address);
        let url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encoded}&access_token=${mapToken}&types=address,place,poi&country=gb&limit=5&session_token=${sessionToken}`;
        if (userLocation) {
          url += `&proximity=${userLocation.long},${userLocation.lat}`;
        }
        const suggestRes = await fetch(url);
        if (!suggestRes.ok) return;
        const suggestData = await suggestRes.json();

        if (!suggestData.suggestions?.length) return;

        const detailed = await Promise.all(
          suggestData.suggestions.map(async (s: any) => {
            const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}?access_token=${mapToken}&session_token=${sessionToken}`;
            const res = await fetch(retrieveUrl);
            if (!res.ok) return null;
            const data = await res.json();
            const f = data.features?.[0];
            if (!f) return null;
            const postcode = f.properties.context?.postcode?.name || '';
            const displayName = `${s.name || f.properties.full_address || f.properties.name || f.properties.place_name}${postcode ? `, ${postcode}` : ''}`;
            return {
              name: displayName,
              lat: f.geometry.coordinates[1],
              long: f.geometry.coordinates[0],
            };
          })
        );

        setSuggestions(detailed.filter((item): item is NonNullable<typeof item> => !!item));
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [address, userLocation, mapToken]);

  const onSelectSuggestion = (s: { name: string; lat: number; long: number }) => {
    setAddress(s.name);
    setUserLocation({ lat: s.lat, long: s.long });
    setSuggestions([]);
    handleSearch();
    setMenuOpen(false);
  };

  const onSearchButton = () => {
    handleSearch(address.trim() || undefined);
    setMenuOpen(false);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, long: pos.coords.longitude };
          setUserLocation(loc);
          setAddress('Current location');
          handleSearch();
        },
        (err) => {
          alert("Location access denied.");
        }
      );
    } else {
      alert("Geolocation not supported.");
    }
  };

  const clearLocation = () => {
    setUserLocation(null);
    setAddress('');
    setSuggestions([]);
  };

  return (
    <div className="absolute top-20 left-5 z-20 w-72 bg-black/90 text-amber-400 p-4 rounded-lg border border-amber-700 shadow-lg backdrop-blur-md">
      <h1 className="text-xl font-semibold uppercase tracking-wide mb-4 border-b border-amber-600 pb-2">
        Ye Olde Trip
      </h1>

      {!userLocation && (
        <p className="text-sm text-red-400 mb-4">Please set your location to search.</p>
      )}

      <div className="mb-4 relative">
        <label className="block text-stone-300 mb-1 font-medium text-sm">
          Location / Address
        </label>
        <input
          type="text"
          placeholder="Type address, city, or place..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-2 rounded-md bg-gray-800 text-white border border-amber-600 focus:outline-none focus:border-amber-400 text-sm"
          disabled={disabled}
        />

        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 mt-1 bg-black/95 border border-amber-700 rounded-md shadow-md max-h-48 overflow-y-auto z-50">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="p-2 hover:bg-amber-800/50 cursor-pointer text-amber-200 text-sm"
                onClick={() => onSelectSuggestion(s)}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex gap-2">
          <button
            onClick={useCurrentLocation}
            className="flex-1 bg-blue-700 text-white py-1 px-2 rounded-md hover:bg-blue-600 transition text-sm font-medium"
            disabled={disabled || isLoading}
          >
            📍 Current Location
          </button>
          <button
            onClick={clearLocation}
            className="flex-1 bg-gray-700 text-white py-1 px-2 rounded-md hover:bg-gray-600 transition text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-stone-300 mb-1 font-medium text-sm">
          Search Radius: {radiusMiles} miles
        </label>
        <input
          type="range"
          min={1}
          max={5}
          step={0.5}
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(parseFloat(e.target.value))}
          className="w-full accent-amber-500"
        />
      </div>

      <button
        className="w-full bg-amber-600 text-black font-medium py-2 rounded-md hover:bg-amber-500 transition shadow-sm text-sm"
        onClick={onSearchButton}
        disabled={disabled || !userLocation || isLoading}
      >
        {isLoading ? 'Searching...' : 'Find Pubs & Bars Nearby'}
      </button>

      {isLoading && (
        <div className="mt-2 text-center text-sm text-stone-400">Loading...</div>
      )}

      {errorMsg && (
        <div className="mt-2 p-2 bg-red-900/50 text-red-200 rounded text-sm">
          {errorMsg}
        </div>
      )}

      {pubsLength > 0 && (
        <div className="mt-2 text-sm text-stone-400">
          Found {pubsLength} pubs/bars within {radiusMiles} miles
        </div>
      )}
    </div>
  );
}