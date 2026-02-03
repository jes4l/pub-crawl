import React, { useState, useEffect } from 'react';

interface Pub {
  lat: number;
  long: number;
  name: string;
  address?: string;
  category?: string;
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

  return (
    <div className="relative bg-[#f4e4bc] p-1 max-w-[280px] font-serif border-2 border-[#5d4037] shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(93,64,55,0.2)] rounded-sm overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-30 pointer-events-none mix-blend-multiply"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#5d4037]/50 to-transparent"></div>
      
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center bg-[#5d4037] text-[#f4e4bc] rounded-full border border-[#3e2723] shadow-sm hover:bg-[#3e2723] transition-colors font-bold leading-none pb-0.5"
      >
        &times;
      </button>

      <div className="relative h-36 w-full overflow-hidden mb-3 bg-[#e0ce9e] border border-[#5d4037] shadow-inner rounded-sm group">
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
                className="object-cover w-full h-full sepia-[.8] contrast-[1.1] brightness-[0.85] hue-rotate-[-10deg] blur-[0.3px] group-hover:scale-110 transition-transform duration-700" 
                onError={() => setImgUrl('/assets/organgrinder.jpg')}
            />
            <div className="absolute inset-0 bg-[#3e2723] mix-blend-color opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-50 pointer-events-none"></div>
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(62,39,35,0.8)] pointer-events-none"></div>
          </>
        )}
      </div>
      
      <div className="text-center relative z-10 px-2 pb-2">
        <h3 className="font-bold text-[#3e2723] text-xl leading-tight mb-1 uppercase tracking-wide border-b border-[#5d4037]/30 pb-1 inline-block">{pub.name}</h3>
        <div className="flex items-center justify-center gap-2 my-1">
            <span className="h-[1px] w-4 bg-[#5d4037]/50"></span>
            <p className="text-xs text-[#5d4037] italic font-bold">{pub.category}</p>
            <span className="h-[1px] w-4 bg-[#5d4037]/50"></span>
        </div>
        {pub.address && <p className="text-[11px] text-[#795548] mt-1 font-semibold leading-snug">{pub.address}</p>}
      </div>
    </div>
  );
}