"use client";
import React, { useState, useRef } from 'react';

interface ControlsProps {
  onSearch: () => void;
  onLocationSelect: (lat: number, long: number, name: string) => void;
  onGPS: () => void;
  isLoading: boolean;
  radius: number;
  setRadius: (r: number) => void;
  errorMsg: string | null;
  mapToken?: string;
}

export default function Controls({ 
    onSearch, onLocationSelect, onGPS, isLoading, radius, setRadius, errorMsg, mapToken 
}: ControlsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
        setSuggestions([]);
        return;
    }

    debounceRef.current = setTimeout(async () => {
        try {
            const sessionToken = "session-" + Math.random();
            const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(val)}&access_token=${mapToken}&country=gb&types=address,place,poi&limit=5&session_token=${sessionToken}`;
            
            const res = await fetch(url);
            if(res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
                setShowSuggestions(true);
            }
        } catch(e) { console.error(e); }
    }, 300);
  };

  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    try {
        const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${mapToken}&session_token=retrieve-${Math.random()}`;
        const res = await fetch(url);
        const data = await res.json();
        const feature = data.features?.[0];
        
        if (feature) {
            const [long, lat] = feature.geometry.coordinates;
            onLocationSelect(lat, long, suggestion.name);
        }
    } catch (e) {
        console.error(e);
    }
  };

  const handleGo = async () => {
    if (!query.trim()) {
        onSearch();
        return;
    }

    try {
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&access_token=${mapToken}&country=gb&types=place,address&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            await handleSelect(data.suggestions[0]);
        } else {
            onSearch();
        }
    } catch (e) {
        onSearch();
    }
  };

  return (
    <>
        {!isOpen && (
             <button 
                onClick={() => setIsOpen(true)}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 bg-[#f4e4bc] text-[#4a3b2a] px-8 py-3 rounded-lg font-serif font-bold shadow-2xl border-2 border-[#6d4c41] hover:scale-105 transition-all tracking-widest"
             >
                🔍 OPEN MAP
             </button>
        )}

        <div className={`absolute bottom-0 left-0 w-full z-40 transition-transform duration-500 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            <div className="bg-[#f4e4bc] border-t-4 border-[#5d4037] pb-8 pt-6 px-4 shadow-[0_-10px_50px_rgba(0,0,0,0.9)] relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>

                <div className="max-w-xl mx-auto relative z-10">
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="absolute -top-10 right-0 bg-[#5d4037] text-[#f4e4bc] rounded-t-lg px-4 py-1 text-xs font-serif font-bold shadow-lg border-x-2 border-t-2 border-[#3e2723]"
                    >
                        ⬇ HIDE
                    </button>

                    <h2 className="text-[#5d4037] font-serif font-bold uppercase text-lg tracking-[0.2em] mb-4 text-center border-b-2 border-[#5d4037]/20 pb-2">
                        Plan Your Journey
                    </h2>

                    <div className="relative z-50 mb-4">
                        <div className="flex gap-2 p-1 bg-[#e0ce9e] rounded-lg border border-[#8d6e63] shadow-inner">
                            <input 
                                type="text" 
                                placeholder="Enter Town, City or Inn..."
                                className="flex-1 bg-transparent border-none px-4 py-3 text-[#3e2723] placeholder-[#8d6e63] focus:outline-none focus:ring-0 font-serif text-lg"
                                value={query}
                                onChange={handleInputChange}
                                onFocus={() => query.length > 2 && setShowSuggestions(true)}
                            />
                            <button 
                                onClick={handleGo}
                                disabled={isLoading}
                                className="bg-[#5d4037] text-[#f4e4bc] font-serif font-bold px-6 rounded-md hover:bg-[#4e342e] disabled:opacity-50 transition-colors shadow-md border border-[#3e2723]"
                            >
                                {isLoading ? 'SCOUTING...' : 'GO'}
                            </button>
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 w-full bg-[#fdf5e6] border-2 border-[#5d4037] rounded-lg mb-2 shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto z-[100]">
                                {suggestions.map((s, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleSelect(s)}
                                        className="p-3 border-b border-[#d7ccc8] hover:bg-[#efebe9] cursor-pointer flex flex-col group transition-colors"
                                    >
                                        <span className="text-[#3e2723] font-serif font-bold text-lg group-hover:text-[#5d4037]">{s.name}</span>
                                        <span className="text-[#795548] text-xs font-serif italic truncate">
                                            {s.full_address || s.address || s.place_formatted}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-2 font-serif text-[#5d4037]">
                        <div className="flex items-center gap-4 w-2/3 bg-[#e0ce9e] p-2 rounded-lg border border-[#8d6e63]/30 shadow-sm">
                            <span className="text-sm font-bold whitespace-nowrap">Range: {radius} mi</span>
                            <input 
                                type="range" min="0.5" max="5" step="0.5" 
                                value={radius} 
                                onChange={(e) => setRadius(parseFloat(e.target.value))}
                                className="w-full h-2 bg-[#8d6e63] rounded-lg appearance-none cursor-pointer accent-[#3e2723]"
                            />
                        </div>
                        <button 
                            onClick={onGPS} 
                            className="flex items-center gap-1 text-sm font-bold text-[#3e2723] hover:text-[#1a120b] border-b border-dashed border-[#3e2723]"
                        >
                            <span>📍</span> LOCATE ME
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 text-[#7f1d1d] font-serif text-sm text-center bg-[#fca5a5]/30 p-2 rounded border border-[#ef4444]/50">
                            ⚠ {errorMsg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
  );
}