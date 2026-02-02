"use client";
import { useEffect } from 'react';
import { useMap } from 'react-map-gl/mapbox';

interface Props {
  userLocation: { lat: number; long: number } | null;
}

export default function MapController({ userLocation }: Props) {
  const { current: map } = useMap();

  useEffect(() => {
    if (map && userLocation) {
      map.flyTo({
        center: [userLocation.long, userLocation.lat],
        zoom: 14.5,
        pitch: 45,
        bearing: 0,
        essential: true,
        duration: 2000,
      });
    }
  }, [userLocation, map]);

  return null;
}