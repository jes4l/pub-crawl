import React from 'react';

interface Pub {
  lat: number;
  long: number;
  name: string;
  address?: string;
  category?: string;
}

export default function PubCard({ pub }: { pub: Pub }) {
  const seed = pub.name.length % 10;
  const imgUrl = `https://images.unsplash.com/photo-${seed === 0 ? '1514933651103-005eec06c04b' : seed === 1 ? '1572116464521-09016447a610' : '1543007630-9710e48aa0db'}?auto=format&fit=crop&w=300&q=80`;

  return (
    <div className="bg-white p-2 max-w-[250px] font-serif border-4 border-white shadow-xl rotate-1">
      <div className="relative h-32 w-full overflow-hidden mb-2 bg-gray-200 sepia-[.4] contrast-125 brightness-90 grayscale-[0.2]">
        <img 
            src={imgUrl} 
            alt={pub.name} 
            className="object-cover w-full h-full opacity-90 mix-blend-multiply" 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 pointer-events-none"></div>
      </div>
      
      <div className="text-center">
        <h3 className="font-bold text-black text-lg leading-tight mb-1">{pub.name}</h3>
        <p className="text-xs text-gray-500 italic font-mono">{pub.category || "Public House"}</p>
        {pub.address && <p className="text-[10px] text-gray-400 mt-1 truncate">{pub.address}</p>}
      </div>
    </div>
  );
}