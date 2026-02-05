"use client";
import React, { useState, useRef } from 'react';

interface ControlsProps {
  onSearch: () => void;
  onLocationSelect: (lat: number, long: number, name: string) => void;
  onGPS: () => void;
  isLoading: boolean;
  radius: number;
  setRadius: (r: number) => void;
  pubCount: number;
  setPubCount: (c: number) => void;
  crawlType: 'sovereign' | 'conqueror';
  setCrawlType: (t: 'sovereign' | 'conqueror') => void;
  tier: string;
  setTier: (t: string) => void;
  isLegDay: boolean;
  setIsLegDay: (b: boolean) => void;
  errorMsg: string | null;
}

export default function Controls({
  onSearch,
  onLocationSelect,
  onGPS,
  isLoading,
  radius,
  setRadius,
  pubCount,
  setPubCount,
  crawlType,
  setCrawlType,
  tier,
  setTier,
  isLegDay,
  setIsLegDay,
  errorMsg
}: ControlsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) return setSuggestions([]);

    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
          val
        )}&access_token=${mapToken}&country=gb&types=address,place,poi&limit=5&session_token=${crypto.randomUUID()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {}
    }, 300);
  };

  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.name);
    setSuggestions([]);
    try {
      const res = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${
          suggestion.mapbox_id
        }?access_token=${mapToken}&session_token=${crypto.randomUUID()}`
      );
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) {
        const [long, lat] = feature.geometry.coordinates;
        onLocationSelect(lat, long, suggestion.name);
      }
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden absolute top-4 right-4 z-50 bg-[#5d4037] text-[#f4e4bc] p-2 rounded-full shadow-lg border-2 border-[#f4e4bc]"
      >
        {isOpen ? '✖' : '⚙'}
      </button>

      <div
        className={`
        absolute top-0 left-0 h-full bg-[#f4e4bc] border-r-4 border-[#5d4037] shadow-2xl z-40 
        transition-transform duration-300 ease-in-out w-full md:w-[320px] overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>

        <div className="relative z-10 p-4 flex flex-col h-full gap-4">
          <div className="border-b-2 border-[#5d4037]/20 pb-2 text-center">
            <h1 className="text-[#5d4037] font-serif font-bold text-xl tracking-widest uppercase">
              Ye Olde Trip
            </h1>
            <p className="text-[10px] text-[#8d6e63] font-bold uppercase tracking-wider">
              Pub Crawl Planner
            </p>
          </div>

          <div className="relative">
            <div className="flex bg-[#e0ce9e] rounded border border-[#8d6e63] shadow-inner">
              <input
                type="text"
                placeholder="Search location..."
                className="flex-1 bg-transparent border-none px-3 py-2 text-[#3e2723] placeholder-[#8d6e63] focus:outline-none text-sm font-bold"
                value={query}
                onChange={handleInputChange}
              />
              <button onClick={() => onSearch()} className="px-3 text-lg">
                🔍
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-[#fdf5e6] border-2 border-[#5d4037] mt-1 shadow-xl z-50 max-h-40 overflow-y-auto rounded-sm">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelect(s)}
                    className="p-2 border-b border-[#d7ccc8] hover:bg-[#efebe9] cursor-pointer text-xs font-bold text-[#3e2723]"
                  >
                    {s.name}{' '}
                    <span className="opacity-50 block text-[10px]">{s.place_formatted}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onGPS}
            className="w-full py-2 bg-[#5d4037] text-[#f4e4bc] text-xs font-bold rounded shadow hover:bg-[#4e342e] transition-colors border border-[#3e2723]"
          >
            📍 USE MY GPS LOCATION
          </button>

          <hr className="border-[#5d4037]/20" />

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-[#5d4037] block mb-1">
                Quality Tier
              </label>
              <div className="flex flex-col gap-1">
                {['Bottom of the Barrel', 'Passable', 'Aristocrat'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`w-full text-left px-3 py-2 border transition-all rounded-sm flex flex-col gap-1
                      ${
                        tier === t
                          ? 'bg-[#5d4037] text-[#f4e4bc] border-[#3e2723]'
                          : 'bg-[#e0ce9e] text-[#5d4037] border-[#8d6e63]/30 hover:bg-[#d7ccc8]'
                      }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold">
                        {t === 'Bottom of the Barrel'
                          ? '🛢️ Bottom Barrel'
                          : t === 'Passable'
                          ? '🍺 Passable'
                          : '🎩 Aristocrat'}
                      </span>
                      {tier === t && <span>✓</span>}
                    </div>
                    <span className="text-[9px] opacity-80 leading-tight">
                        {t === 'Aristocrat' && "Willing to travel for quality? Expect high ratings and higher prices."}
                        {t === 'Bottom of the Barrel' && "Expect your fare to rise. Cheap, cheerful, and possibly dangerous."}
                        {t === 'Passable' && "The average pint. Not great, not terrible."}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-[#5d4037] block mb-1">
                Route Strategy
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setCrawlType('sovereign')}
                  className={`p-2 text-[10px] font-bold border rounded-sm flex flex-col items-center gap-1 transition-all
                    ${
                      crawlType === 'sovereign'
                        ? 'bg-[#14532d] text-[#dcfce7] border-[#052e16]'
                        : 'bg-[#e0ce9e] text-[#5d4037] border-[#8d6e63]/30'
                    }`}
                >
                  <span>🛡️ Sovereign</span>
                  <span className="opacity-70 text-[8px] uppercase">Safe Route</span>
                </button>
                <button
                  onClick={() => setCrawlType('conqueror')}
                  className={`p-2 text-[10px] font-bold border rounded-sm flex flex-col items-center gap-1 transition-all
                    ${
                      crawlType === 'conqueror'
                        ? 'bg-[#7f1d1d] text-[#fee2e2] border-[#450a0a]'
                        : 'bg-[#e0ce9e] text-[#5d4037] border-[#8d6e63]/30'
                    }`}
                >
                  <span>⚔️ Conqueror</span>
                  <span className="opacity-70 text-[8px] uppercase">High Risk</span>
                </button>
              </div>
            </div>

            <div className="bg-[#e0ce9e]/50 p-3 rounded border border-[#8d6e63]/30 flex items-center justify-between group cursor-pointer" onClick={() => setIsLegDay(!isLegDay)}>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-[#5d4037] cursor-pointer">
                        Is it Leg Day?
                    </label>
                    <p className="text-[9px] text-[#5d4037]/80 italic leading-tight">
                        {isLegDay ? "Hilliest pubs first. 🦵" : "Flat route optimized. 😌"}
                    </p>
                 </div>
                 
                 <div className={`w-12 h-6 rounded-full relative transition-all duration-300 border-2 shadow-inner
                    ${isLegDay ? 'bg-[#5d4037] border-[#3e2723]' : 'bg-[#d7ccc8] border-[#a1887f]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-[#f4e4bc] rounded-full shadow-md transition-all duration-300 transform
                        ${isLegDay ? 'translate-x-6' : 'translate-x-0'}`}>
                    </div>
                 </div>
            </div>

            <div className="bg-[#e0ce9e]/50 p-3 rounded border border-[#8d6e63]/30 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#5d4037] mb-1">
                  <span>Search Radius</span>
                  <span>{radius}m</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#8d6e63] rounded-lg appearance-none cursor-pointer accent-[#3e2723]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#5d4037] mb-1">
                  <span>Stops</span>
                  <span>{pubCount} Pubs</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={pubCount}
                  onChange={(e) => setPubCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#8d6e63] rounded-lg appearance-none cursor-pointer accent-[#3e2723]"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            {errorMsg && (
              <div className="text-[#7f1d1d] text-[10px] text-center bg-[#fca5a5]/30 p-2 rounded border border-[#ef4444]/50 font-bold">
                ⚠ {errorMsg}
              </div>
            )}
            <button
              onClick={onSearch}
              className="w-full py-3 mt-2 bg-[#3e2723] text-[#f4e4bc] text-sm font-bold rounded shadow-lg hover:scale-[1.02] transition-transform border-2 border-[#5d4037] tracking-widest"
            >
              {isLoading ? 'SCOUTING...' : 'START CRAWL'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}