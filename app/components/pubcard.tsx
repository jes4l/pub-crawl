import React, { useState, useEffect } from 'react';

interface Pub {
  lat: number;
  long: number;
  name: string;
  address?: string;
  category?: string;
  crimeCount?: number;
  crimeBreakdown?: Record<string, number>;
  tier?: string;
  rating?: number;
}

export default function PubCard({ pub, onClose }: { pub: Pub, onClose: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const fetchImage = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/pubimage?name=${encodeURIComponent(pub.name)}&lat=${pub.lat}&long=${pub.long}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (mounted) setImgUrl(data.imageUrl || '/assets/organgrinder.jpg');
      } catch {
        if (mounted) setImgUrl('/assets/organgrinder.jpg');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchImage();
    return () => { mounted = false; };
  }, [pub.name, pub.lat, pub.long]);

  const getTierColor = (tier: string | undefined) => {
    if (tier === 'Aristocrat') return 'bg-[#4c1d95] text-[#e9d5ff] border-[#2e1065] ring-1 ring-[#e9d5ff]/50';
    if (tier === 'Bottom of the Barrel') return 'bg-[#713f12] text-[#fef9c3] border-[#422006] ring-1 ring-[#fef9c3]/50';
    return 'bg-[#1e3a8a] text-[#dbeafe] border-[#172554] ring-1 ring-[#dbeafe]/50';
  };

  return (
    <div className="relative bg-[#f4e4bc] p-0 w-[280px] font-serif border-4 border-[#5d4037] shadow-[0_10px_25px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(93,64,55,0.3)] rounded-lg overflow-hidden flex flex-col transform transition-all duration-300">
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-40 pointer-events-none mix-blend-multiply z-0"></div>
      
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 z-30 w-7 h-7 flex items-center justify-center bg-[#5d4037] text-[#f4e4bc] rounded-full border-2 border-[#f4e4bc] shadow-md hover:bg-[#3e2723] hover:scale-110 transition-all font-bold leading-none pb-0.5"
      >
        &times;
      </button>

      <div className="relative z-10 bg-[#5d4037] p-3 pb-4 border-b-2 border-[#8d6e63] shadow-md">
         <h3 className="font-bold text-[#f4e4bc] text-lg leading-tight uppercase tracking-wide text-center drop-shadow-md">
            {pub.name}
         </h3>
         <div className="flex justify-center items-center gap-2 mt-2">
            {pub.crimeCount !== undefined && (
              <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1
                ${pub.crimeCount > 5 ? 'bg-[#7f1d1d] text-[#fee2e2] border-[#fca5a5]' : 'bg-[#14532d] text-[#dcfce7] border-[#86efac]'}`}>
                <span>{pub.crimeCount > 5 ? '⚠️' : '🛡️'}</span> Hazard Lvl: {pub.crimeCount}
              </div>
            )}
            {pub.tier && (
              <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black tracking-widest uppercase shadow-sm ${getTierColor(pub.tier)}`}>
                {pub.tier}
              </div>
            )}
         </div>
      </div>

      <div className="relative h-36 w-full overflow-hidden block border-y-4 border-[#3e2723]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#d7ccc8]">
            <span className="text-[#5d4037] text-xs tracking-[0.2em] uppercase font-bold animate-pulse">Scouting...</span>
          </div>
        )}

        {!isLoading && imgUrl && (
          <>
            <img 
                src={imgUrl} 
                alt={pub.name} 
                className="object-cover w-full h-full sepia-[.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-5deg]" 
                onError={() => setImgUrl('/assets/organgrinder.jpg')}
            />
            
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 pointer-events-none"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(62,39,35,0.9)] pointer-events-none"></div>
          </>
        )}
      </div>

      <div className="relative z-10 p-3 flex flex-col gap-2">
        <div className="text-center">
            <p className="text-[10px] text-[#5d4037]/70 font-bold uppercase tracking-widest mb-1">Establishment Details</p>
            <div className="flex items-center justify-center gap-2 text-[#3e2723] text-xs font-semibold bg-[#e0ce9e]/40 py-1 rounded border border-[#5d4037]/10">
                <span>{pub.category}</span>
                <span className="text-[#5d4037]/40">•</span>
                <span>⭐ {pub.rating || 'N/A'}</span>
            </div>
            {pub.address && (
                <p className="text-[10px] text-[#5d4037] mt-2 leading-tight px-2 italic font-medium">
                    {pub.address}
                </p>
            )}
        </div>

        {pub.crimeBreakdown && Object.keys(pub.crimeBreakdown).length > 0 ? (
            <div className="mt-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[1px] flex-1 bg-[#5d4037]/20"></div>
                    <span className="text-[9px] font-black text-[#7f1d1d] uppercase tracking-widest">Risk Report</span>
                    <div className="h-[1px] flex-1 bg-[#5d4037]/20"></div>
                </div>
                <div className="bg-[#e0ce9e]/40 rounded border border-[#5d4037]/20 p-1.5 shadow-inner">
                    <ul className="text-[10px] text-[#3e2723] space-y-1 max-h-[70px] overflow-y-auto pr-1 custom-scrollbar">
                        {Object.entries(pub.crimeBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                            <li key={type} className="flex justify-between items-center border-b border-[#5d4037]/10 last:border-0 pb-0.5 last:pb-0">
                                <span className="truncate flex-1 pr-2 font-medium capitalize opacity-90">{type}</span>
                                <span className="text-[#991b1b] font-bold text-[9px] bg-[#fecaca] px-1.5 rounded-sm shadow-sm">{count}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        ) : (
             <div className="mt-2 text-center py-2 bg-[#14532d]/10 rounded border border-[#14532d]/20 border-dashed">
                <p className="text-[10px] text-[#14532d] font-bold uppercase tracking-wide">No Recent Incidents</p>
             </div>
        )}
      </div>

      <div className="h-2 bg-[#5d4037] w-full mt-auto border-t border-[#8d6e63]"></div>
    </div>
  );
}