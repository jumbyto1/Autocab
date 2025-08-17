import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';

interface Location {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface EnhancedBookingMapProps {
  pickup?: Location | null;
  destination?: Location | null;
  viaPoints?: Location[];
  currentPrice?: number | null;
  onMapReady?: (map: any) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  showPins?: boolean; // Control when to show pins
  showDraggablePin?: boolean; // Show draggable pin for location selection
  preserveRoute?: boolean; // Păstrează ruta vizibilă când step-ul se schimbă
  onPinDrag?: (coords: { lat: number; lng: number }) => void;
  onPinDragEnd?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export function EnhancedBookingMap({ 
  pickup, 
  destination, 
  viaPoints = [], 
  currentPrice, 
  onMapReady,
  onMapClick,
  showPins = false,
  showDraggablePin = false,
  preserveRoute = false,
  onPinDrag,
  onPinDragEnd,
  className = ""
}: EnhancedBookingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  // Removed draggable pin ref - using static red pin instead
  const directionsRendererRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBounds, setCurrentBounds] = useState<any>(null);
  const [preserveBounds, setPreserveBounds] = useState(false);
  const centerChangeListenerRef = useRef<any>(null);

  // Clear all map elements (but preserve route if needed)
  const clearMapElements = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    // Only clear directions if not preserving route
    if (directionsRendererRef.current && !preserveRoute) {
      directionsRendererRef.current.setMap(null);
    }
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        console.log('🗺️ Loading Google Maps API for Enhanced Booking Map...');
        
        // Load Google Maps API first
        await loadGoogleMapsAPI();
        console.log('🗺️ Google Maps API loaded, initializing map...');
        
        if (!window.google?.maps) {
          throw new Error('Google Maps API not available after loading');
        }
        
        const defaultPosition = { lat: 51.279, lng: 1.083 }; // Canterbury center
        
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current!, {
          center: defaultPosition,
          zoom: 22,
          mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy', // Eliminăm "Use two fingers" - permite scroll cu un deget
          restriction: {
            latLngBounds: {
              north: 51.4,
              south: 51.1,
              east: 1.4,
              west: 0.8
            },
            strictBounds: false
          }
          // Note: styles cannot be used with mapId - controlled via Google Cloud Console
        });

        // Setup responsive resize handler
        let resizeTimeout: number;
        const handleResize = () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = window.setTimeout(() => {
            if (mapInstanceRef.current) {
              window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
              // Re-fit bounds if we have them
              if (currentBounds) {
                const padding = calculateMobilePadding();
                mapInstanceRef.current.fitBounds(currentBounds, padding);
              }
            }
          }, 300);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Add click listener for moving pin
        if (onMapClick) {
          mapInstanceRef.current.addListener('click', (event: any) => {
            if (event.latLng) {
              const coords = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              };
              onMapClick(coords);
            }
          });
          
          console.log('🗺️ Map click listener added for static red pin workflow');
          console.log('🗺️ onMapClick callback available:', typeof onMapClick);
        }

        setIsMapLoaded(true);
        setIsLoading(false);
        onMapReady?.(mapInstanceRef.current);
        console.log('🗺️ Enhanced Booking Map initialized successfully');
      } catch (error) {
        console.error('🚨 Enhanced map initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [onMapReady]);

  // Clear all markers and routes when any location changes
  useEffect(() => {
    if (!isMapLoaded) return;
    clearMapElements();
    
    // Also clear any existing route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  }, [isMapLoaded, pickup?.coordinates, destination?.coordinates, viaPoints]);

  // Manage center_changed listener dynamically based on onMapClick prop
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Remove existing listener
    if (centerChangeListenerRef.current) {
      google.maps.event.removeListener(centerChangeListenerRef.current);
      centerChangeListenerRef.current = null;
      console.log('🗺️ Removed previous center_changed listener');
    }

    // Add new listener if onMapClick is provided - ONLY FOR MANUAL PIN MOVEMENT
    if (onMapClick) {
      // Track if user is manually dragging/panning the map
      let userInteracting = false;
      let interactionTimeout: number;
      
      // Detect user interaction start
      const dragStartListener = mapInstanceRef.current.addListener('dragstart', () => {
        userInteracting = true;
        clearTimeout(interactionTimeout);
        console.log('🗺️ USER STARTED DRAGGING MAP');
      });
      
      // Detect user interaction end
      const dragEndListener = mapInstanceRef.current.addListener('dragend', () => {
        // Wait a bit before allowing auto-centering again
        interactionTimeout = window.setTimeout(() => {
          userInteracting = false;
          console.log('🗺️ USER FINISHED DRAGGING MAP');
        }, 1000);
      });
      
      centerChangeListenerRef.current = mapInstanceRef.current.addListener('center_changed', () => {
        if (!mapInstanceRef.current || !userInteracting) return;
        
        const center = mapInstanceRef.current.getCenter();
        if (center) {
          const coords = {
            lat: center.lat(),
            lng: center.lng()
          };
          
          // Only call onMapClick when user is actively dragging
          clearTimeout((window as any).centerChangeTimeout);
          (window as any).centerChangeTimeout = setTimeout(() => {
            console.log('🗺️ USER MOVED MAP - Red pin coordinates:', coords);
            onMapClick(coords);
          }, 200);
        }
      });
      
      console.log('🗺️ Added center_changed listener for manual map movement only');
    }

    // Cleanup on unmount
    return () => {
      if (centerChangeListenerRef.current) {
        google.maps.event.removeListener(centerChangeListenerRef.current);
        centerChangeListenerRef.current = null;
      }
    };
  }, [isMapLoaded, onMapClick]);

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

    // High zoom to level 20 for detailed pickup location view
    mapInstanceRef.current.panTo(pickup.coordinates);
    mapInstanceRef.current.setZoom(20);

    markersRef.current.push(pickupMarker);
    console.log('🟢 Pickup pin placed:', pickup.address);
  }, [pickup, isMapLoaded, showPins]);

  // Removed draggable pin system - static red pin in center is much easier to use

  // Add red destination pin when destination is set
  useEffect(() => {
    if (!isMapLoaded || !destination?.coordinates || !showPins) return;
    
    // Create red destination pin
    const destinationIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="destGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stop-color="#ff4444"/>
              <stop offset="100%" stop-color="#cc0000"/>
            </radialGradient>
            <filter id="destShadow">
              <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M20 2C12.3 2 6 8.3 6 16c0 10.5 14 32 14 32s14-21.5 14-32c0-7.7-6.3-14-14-14z" 
                fill="url(#destGradient)" stroke="#990000" stroke-width="1" filter="url(#destShadow)"/>
          <circle cx="20" cy="16" r="8" fill="#ffffff"/>
          <text x="20" y="21" text-anchor="middle" fill="#cc0000" font-family="Arial, sans-serif" font-size="12" font-weight="bold">D</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 50),
      anchor: new window.google.maps.Point(20, 50)
    };

    const destinationMarker = new window.google.maps.Marker({
      position: destination.coordinates,
      map: mapInstanceRef.current,
      title: `Destination: ${destination.address}`,
      draggable: false,
      icon: destinationIcon
    });

    markersRef.current.push(destinationMarker);
    console.log('🔴 Red destination pin placed:', destination.address);
  }, [destination, isMapLoaded, showPins]);

  // Mobile-adaptive padding calculation for responsive map centering
  const calculateMobilePadding = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Mobile portrait - prioritize journey visibility
    if (viewport.width <= 768) {
      return {
        top: 50,
        right: 30,
        bottom: 80, // Reduced space for better journey visibility
        left: 30
      };
    }
    // Mobile landscape
    else if (viewport.width <= 1024 && viewport.height <= 768) {
      return {
        top: 30,
        right: 40,
        bottom: 80,
        left: 40
      };
    }
    // Desktop
    else {
      return {
        top: 50,
        right: 50,
        bottom: 100,
        left: 50
      };
    }
  };

  // Auto-fit map to show both pickup and destination when both are available
  useEffect(() => {
    if (!isMapLoaded || !pickup?.coordinates || !destination?.coordinates || !showPins || !mapInstanceRef.current) return;
    
    console.log('🗺️ Auto-fitting map to show both pickup and destination');
    
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickup.coordinates);
    bounds.extend(destination.coordinates);
    setCurrentBounds(bounds);
    setPreserveBounds(true);
    
    // Enhanced mobile padding to center journey above panel
    const enhancedMobilePadding = () => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      if (viewport.width <= 768) {
        return {
          top: 20,     // Harta mai sus
          right: 25,
          bottom: 320, // Mai mult spațiu pentru panel ca să fie harta mai mică
          left: 25
        };
      } else {
        return {
          top: 50,
          right: 40,
          bottom: 200,
          left: 40
        };
      }
    };
    
    // Initial fit with enhanced padding
    setTimeout(() => {
      if (!mapInstanceRef.current) return;
      const padding = enhancedMobilePadding();
      mapInstanceRef.current.fitBounds(bounds, padding);
      
      // Ensure reasonable zoom level for mobile journey view
      const currentZoom = mapInstanceRef.current.getZoom();
      if (currentZoom && currentZoom > 14) {
        mapInstanceRef.current.setZoom(14); // Slightly more zoomed out for better journey view
      }
      
      console.log('🗺️ Map centered with enhanced padding to show full journey');
    }, 500);

  }, [pickup?.coordinates, destination?.coordinates, isMapLoaded, showPins]);

  // Preserve route bounds when form position changes
  useEffect(() => {
    if (!preserveBounds || !currentBounds || !mapInstanceRef.current) return;
    
    const handleResize = () => {
      if (!mapInstanceRef.current || !currentBounds) return;
      const padding = calculateMobilePadding();
      mapInstanceRef.current.fitBounds(currentBounds, padding);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [preserveBounds, currentBounds]);

  // Draw route line between pickup and destination
  useEffect(() => {
    if (!isMapLoaded || !pickup?.coordinates || !destination?.coordinates || !showPins || !mapInstanceRef.current) return;
    
    console.log('🛣️ Drawing route between:', pickup.coordinates, 'and', destination.coordinates);
    
    // Create DirectionsService and DirectionsRenderer
    const directionsService = new window.google.maps.DirectionsService();
    
    // Always create a fresh DirectionsRenderer to ensure it shows
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // We use our custom markers
      polylineOptions: {
        strokeColor: '#3B82F6', // Blue color for route line
        strokeWeight: 5,
        strokeOpacity: 0.9
      }
    });
    
    directionsRendererRef.current.setMap(mapInstanceRef.current);
    
    // Request directions between pickup and destination
    directionsService.route({
      origin: pickup.coordinates,
      destination: destination.coordinates,
      travelMode: window.google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    }, (result, status) => {
      if (status === 'OK' && result && directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
        console.log('🛣️ Blue route line drawn successfully between pickup and destination');
      } else {
        console.error('🚨 Failed to get directions:', status);
      }
    });
    
    // Cleanup function to ensure route is cleared when component unmounts
    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [pickup?.coordinates, destination?.coordinates, isMapLoaded, showPins]);

  return (
    <div className={`relative w-full h-full ${className}`}>
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