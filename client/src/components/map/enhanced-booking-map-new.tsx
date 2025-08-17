import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Location {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface EnhancedBookingMapProps {
  pickup?: Location | null;
  destination?: Location | null;
  viaPoints?: Location[];
  currentPrice?: number | null;
  onMapReady?: (map: google.maps.Map) => void;
  showPins?: boolean; // Control when to show pins
}

export function EnhancedBookingMap({ 
  pickup, 
  destination, 
  viaPoints = [], 
  currentPrice, 
  onMapReady,
  showPins = false 
}: EnhancedBookingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Clear all map elements
  const clearMapElements = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || !window.google?.maps) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        
        const defaultPosition = { lat: 51.279, lng: 1.083 }; // Canterbury center
        
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current!, {
          center: defaultPosition,
          zoom: 12,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        setIsMapLoaded(true);
        setIsLoading(false);
        onMapReady?.(mapInstanceRef.current);
        console.log('🗺️ Enhanced Booking Map initialized');
      } catch (error) {
        console.error('Enhanced map initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [onMapReady]);

  // Clear all markers when any location changes
  useEffect(() => {
    if (!isMapLoaded) return;
    clearMapElements();
  }, [isMapLoaded, pickup?.coordinates, destination?.coordinates, viaPoints]);

  // Add pickup pin ONLY when showPins is true (controlled by parent)
  useEffect(() => {
    if (!isMapLoaded || !pickup?.coordinates || !window.google?.maps || !showPins) return;
    
    // Create classic 3D red pin icon
    const pickupIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="48" height="65" viewBox="0 0 48 65" xmlns="http://www.w3.org/2000/svg">
          <!-- Large drop shadow for 3D effect -->
          <ellipse cx="24" cy="58" rx="12" ry="4" fill="#000000" opacity="0.4"/>
          
          <!-- Gradients for 3D effect -->
          <defs>
            <radialGradient id="pinGradient" cx="0.25" cy="0.25">
              <stop offset="0%" stop-color="#ff4444"/>
              <stop offset="40%" stop-color="#ee2222"/>
              <stop offset="100%" stop-color="#cc0000"/>
            </radialGradient>
            <radialGradient id="innerGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#ffcccc"/>
            </radialGradient>
            <filter id="shadow">
              <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
            </filter>
          </defs>
          
          <!-- Main pin body with classic shape -->
          <path d="M24 8 C32 8, 38 14, 38 22 C38 30, 24 45, 24 45 C24 45, 10 30, 10 22 C10 14, 16 8, 24 8 Z" 
                fill="url(#pinGradient)" stroke="#990000" stroke-width="1" filter="url(#shadow)"/>
          
          <!-- Inner circle with 3D highlight -->
          <circle cx="24" cy="22" r="9" fill="url(#innerGradient)" stroke="#cc0000" stroke-width="1"/>
          
          <!-- Center dot -->
          <circle cx="24" cy="22" r="3" fill="#cc0000"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(48, 65),
      anchor: new window.google.maps.Point(24, 45)
    };

    const pickupMarker = new window.google.maps.Marker({
      position: pickup.coordinates,
      map: mapInstanceRef.current,
      title: `Pickup: ${pickup.address}`,
      draggable: false,
      icon: pickupIcon
    });

    // Dramatic zoom to level 18
    mapInstanceRef.current.panTo(pickup.coordinates);
    mapInstanceRef.current.setZoom(18);

    markersRef.current.push(pickupMarker);
    console.log('🟢 Pickup pin placed:', pickup.address);
  }, [pickup, isMapLoaded, showPins]);

  // Add destination pin ONLY when showPins is true
  useEffect(() => {
    if (!isMapLoaded || !destination?.coordinates || !window.google?.maps || !showPins) return;
    
    // Create destination icon with checkered flag
    const destinationIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="25" cy="55" rx="8" ry="3" fill="#000000" opacity="0.3"/>
          <defs>
            <radialGradient id="destGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stop-color="#f87171"/>
              <stop offset="100%" stop-color="#dc2626"/>
            </radialGradient>
          </defs>
          <path d="M25 10 C35 10, 42 17, 42 27 C42 32, 25 50, 25 50 C25 50, 8 32, 8 27 C8 17, 15 10, 25 10 Z" 
                fill="url(#destGradient)" stroke="#ffffff" stroke-width="2"/>
          <rect x="17" y="19" width="16" height="16" fill="#ffffff"/>
          <rect x="17" y="19" width="4" height="4" fill="#000000"/>
          <rect x="25" y="19" width="4" height="4" fill="#000000"/>
          <rect x="33" y="19" width="4" height="4" fill="#000000"/>
          <rect x="21" y="23" width="4" height="4" fill="#000000"/>
          <rect x="29" y="23" width="4" height="4" fill="#000000"/>
          <rect x="17" y="27" width="4" height="4" fill="#000000"/>
          <rect x="25" y="27" width="4" height="4" fill="#000000"/>
          <rect x="33" y="27" width="4" height="4" fill="#000000"/>
          <rect x="21" y="31" width="4" height="4" fill="#000000"/>
          <rect x="29" y="31" width="4" height="4" fill="#000000"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(50, 60),
      anchor: new window.google.maps.Point(25, 50)
    };

    const destinationMarker = new window.google.maps.Marker({
      position: destination.coordinates,
      map: mapInstanceRef.current,
      title: `Destination: ${destination.address}`,
      draggable: false,
      icon: destinationIcon
    });

    markersRef.current.push(destinationMarker);
    console.log('🏁 Destination pin placed:', destination.address);
  }, [destination, isMapLoaded, showPins]);

  return (
    <div className="relative w-full h-full">
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading Enhanced Map...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '384px' }}
      />

      {/* Price overlay */}
      {currentPrice && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg border z-20">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Price</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">£{currentPrice}</div>
        </div>
      )}
    </div>
  );
}