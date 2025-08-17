import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';
import { useQuery } from '@tanstack/react-query';

interface Location {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface Vehicle {
  id: number;
  callsign: string;
  coordinates?: { lat: number; lng: number };
  status: string;
  statusColor?: string;
  isActive: boolean;
  driverName?: string;
}

interface SimpleBookingMapProps {
  pickup?: Location | null;
  destination?: Location | null;
  currentPrice?: number | null;
  onMapReady?: (map: google.maps.Map) => void;
  onCenterChanged?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  bottomPanelHeight?: number; // Height of bottom panel in vh units (0-100)
  isPinMode?: boolean; // New prop to prevent auto-centering in pin mode
}

export function SimpleBookingMap({ 
  pickup, 
  destination, 
  currentPrice,
  onMapReady,
  onCenterChanged,
  className = "",
  bottomPanelHeight = 30, // Default 30vh bottom panel
  isPinMode = false // Default false - prevents auto-centering when true
}: SimpleBookingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const vehicleMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live vehicles data for tracking
  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 15000, // Update every 15 seconds
  });

  const vehicles = vehiclesData?.vehicles || [];

  // Clear all markers
  const clearMarkers = () => {
    console.log('🧹 Clearing all existing markers...');
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  };

  // Clear vehicle tracking markers
  const clearVehicleMarkers = () => {
    vehicleMarkersRef.current.forEach(marker => marker.setMap(null));
    vehicleMarkersRef.current.clear();
  };

  // Create marine wave effect for vehicle tracking
  const createVehicleMarker = (position: google.maps.LatLng | google.maps.LatLngLiteral, vehicleId: number): google.maps.Marker => {
    // Create custom HTML for marine wave effect with continuous ripples
    const markerIcon = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="marineWave${vehicleId}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ff3333" stop-opacity="1"/>
              <stop offset="50%" stop-color="#ff0000" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#cc0000" stop-opacity="0.2"/>
            </radialGradient>
          </defs>
          
          <!-- Outer ripple wave -->
          <circle cx="12" cy="12" r="10" fill="none" stroke="#ff0000" stroke-width="1" opacity="0.4">
            <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Middle ripple wave -->
          <circle cx="12" cy="12" r="8" fill="none" stroke="#ff3333" stroke-width="1.5" opacity="0.6">
            <animate attributeName="r" values="6;9;6" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Main pulsating center -->
          <circle cx="12" cy="12" r="5" fill="url(#marineWave${vehicleId})" stroke="#ffffff" stroke-width="1">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="scale" 
              values="1;1.1;1" dur="1s" repeatCount="indefinite" 
              transform-origin="12 12"/>
          </circle>
          
          <!-- Inner white core -->
          <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.7;0.9" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `),
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12)
    };

    return new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      icon: markerIcon,
      zIndex: 850, // Behind route markers but visible
      optimized: false // Required for marine animations
    });
  };

  // Update vehicle tracking markers
  const updateVehicleMarkers = () => {
    if (!mapInstanceRef.current || vehicles.length === 0) return;

    console.log('🚗 VEHICLE TRACKING: Updating', vehicles.length, 'vehicles');

    // Clear existing vehicle markers
    clearVehicleMarkers();

    // Add new vehicle markers
    vehicles.forEach(vehicle => {
      if (!vehicle.coordinates?.lat || !vehicle.coordinates?.lng) return;

      const position = {
        lat: vehicle.coordinates.lat,
        lng: vehicle.coordinates.lng
      };

      const marker = createVehicleMarker(position, vehicle.id);
      vehicleMarkersRef.current.set(vehicle.id, marker);

      console.log('🔴 VEHICLE MARKER:', vehicle.callsign, 'at', position);
    });

    console.log('✅ VEHICLE TRACKING: Added', vehicleMarkersRef.current.size, 'vehicle markers');
  };

  // Clear route
  const clearRoute = () => {
    if (directionsRendererRef.current) {
      console.log('🧹 Clearing existing route...');
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  };

  // Auto-center on user's location (view only, no actions)
  const tryAutoCenter = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    
    console.log('📍 Attempting to auto-center map on user location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        console.log('✅ User location detected, centering map:', userCoords);
        
        // Center map on user's location with good zoom level
        mapInstanceRef.current?.setCenter(userCoords);
        mapInstanceRef.current?.setZoom(18);
        
        // Add a small blue dot to show user's location (not interactive)
        new google.maps.Marker({
          position: userCoords,
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285f4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          title: 'Your location'
        });
      },
      (error) => {
        console.log('📍 Could not get user location:', error.message);
        // Silently fail - user will see default Canterbury view
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return; // Don't reinitialize if map already exists

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        console.log('🗺️ INITIALIZING Simple Booking Map (first time only)...');
        
        await loadGoogleMapsAPI();
        
        if (!window.google?.maps) {
          throw new Error('Google Maps API not available');
        }
        
        const defaultPosition = { lat: 51.279, lng: 1.083 }; // Canterbury center
        
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current!, {
          center: defaultPosition,
          zoom: 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          disableDefaultUI: true,
          keyboardShortcuts: false,
          styles: [
            // Always show detailed map with ALL street information visible
            {
              "elementType": "geometry",
              "stylers": [{ "color": "#242f3e" }]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#ffffff" }]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [{ "color": "#000000", "weight": 1 }]
            },
            {
              "featureType": "road",
              "elementType": "labels",
              "stylers": [{ "visibility": "on" }]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#ffffff" }]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.stroke",
              "stylers": [{ "color": "#000000", "weight": 2 }]
            },
            {
              "featureType": "poi",
              "elementType": "labels",
              "stylers": [{ "visibility": "on" }]
            },
            {
              "featureType": "administrative.locality",
              "elementType": "labels",
              "stylers": [{ "visibility": "on" }]
            },
            {
              "featureType": "administrative.neighborhood",
              "elementType": "labels",
              "stylers": [{ "visibility": "on" }]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [{ "color": "#38414e" }]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#17263c" }]
            }
          ],
          restriction: {
            latLngBounds: {
              north: 51.4,
              south: 51.1,
              east: 1.4,
              west: 0.8
            },
            strictBounds: false
          }
        });

        // Center changed listener will be added in separate useEffect

        setIsMapLoaded(true);
        setIsLoading(false);
        onMapReady?.(mapInstanceRef.current);
        console.log('✅ Simple Booking Map initialized');
        
        // Auto-center on user's location at first load (view only, no selection)
        tryAutoCenter();
      } catch (error) {
        console.error('❌ Map initialization failed:', error);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, []); // Empty dependency array - initialize only once

  // Add center changed listener when onCenterChanged callback is provided
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !onCenterChanged) return;
    
    console.log('🎯 Adding center_changed listener for pin mode');
    let centerChangeTimeout: number;
    
    const listener = mapInstanceRef.current.addListener('center_changed', () => {
      if (!mapInstanceRef.current) return;
      
      // Debounce center changes
      clearTimeout(centerChangeTimeout);
      centerChangeTimeout = window.setTimeout(() => {
        const center = mapInstanceRef.current!.getCenter();
        if (center) {
          const coords = {
            lat: center.lat(),
            lng: center.lng()
          };
          console.log('🗺️ Map center changed:', coords);
          onCenterChanged(coords);
        }
      }, 300);
    });
    
    // Cleanup listener when effect runs again or component unmounts
    return () => {
      console.log('🧹 Removing center_changed listener');
      if (listener) {
        window.google?.maps?.event?.removeListener(listener);
      }
      clearTimeout(centerChangeTimeout);
    };
  }, [isMapLoaded, onCenterChanged]);

  // Update markers when coordinates change - CLEAR OLD MARKERS FIRST
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;
    
    // Always clear existing markers first to prevent duplicates
    clearMarkers();
    clearRoute();
    
    // Add pickup marker if available
    if (pickup?.coordinates) {
      console.log('🟢 Adding pickup marker:', pickup.address);
      
      const pickupMarker = new window.google.maps.Marker({
        position: pickup.coordinates,
        map: mapInstanceRef.current,
        title: `Pickup: ${pickup.address}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#22C55E',
          fillOpacity: 1,
          strokeColor: '#16A34A',
          strokeWeight: 2,
          scale: 8
        }
      });
      
      markersRef.current.push(pickupMarker);
    }
    
    // Add destination marker if available
    if (destination?.coordinates) {
      console.log('🔴 Adding destination marker:', destination.address);
      
      const destinationMarker = new window.google.maps.Marker({
        position: destination.coordinates,
        map: mapInstanceRef.current,
        title: `Destination: ${destination.address}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#DC2626',
          strokeWeight: 2,
          scale: 8
        }
      });
      
      markersRef.current.push(destinationMarker);
    }
  }, [pickup?.coordinates, destination?.coordinates, isMapLoaded]);

  // Update vehicle tracking markers when vehicles data changes
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;
    
    console.log('🚗 VEHICLE UPDATE: Vehicles data changed, updating markers...');
    updateVehicleMarkers();
  }, [vehicles, isMapLoaded]);

  // Draw route between pickup and destination and fit bounds
  useEffect(() => {
    console.log('🛣️ Route useEffect triggered:', { 
      isMapLoaded, 
      hasPickup: !!pickup?.coordinates, 
      hasDestination: !!destination?.coordinates,
      isPinMode 
    });
    
    if (!isMapLoaded || !pickup?.coordinates || !destination?.coordinates || !mapInstanceRef.current) {
      // Clear route if coordinates missing
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }
    
    console.log('🛣️ Drawing route between pickup and destination');
    
    const directionsService = new window.google.maps.DirectionsService();
    
    // Clear existing route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // Use our custom markers
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    });
    
    directionsRendererRef.current.setMap(mapInstanceRef.current);
    
    directionsService.route({
      origin: pickup.coordinates,
      destination: destination.coordinates,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK' && result && directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
        console.log('✅ Route drawn successfully');
        
        // 🚨 CRITICAL FIX: Only auto-fit bounds when NOT in pin mode
        console.log('🔍 Pin mode status check:', { isPinMode, shouldFitBounds: !isPinMode });
        if (!isPinMode) {
          console.log('🎯 Auto-fitting bounds (not in pin mode)');
          // Auto-fit to show route in VISIBLE area (not covered by bottom panel)
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(pickup.coordinates);
          bounds.extend(destination.coordinates);
          
          // Calculate visible area and shift center UP to visible zone
          const mapContainer = mapInstanceRef.current!.getDiv();
          const mapHeight = mapContainer.offsetHeight;
          const panelHeightPx = (bottomPanelHeight / 100) * window.innerHeight;
          
          // Key fix: We need to SHIFT the center point UP so journey appears in visible area
          // Instead of just adding padding, we need to physically move the viewport center
          const visibleAreaHeight = mapHeight - panelHeightPx;
          const shiftUpOffset = panelHeightPx * 0.5; // Shift journey up by half panel height
          
          console.log('🎯 VISUAL CENTERING FIX:', {
            mapHeight,
            panelHeightPx, 
            visibleAreaHeight,
            shiftUpOffset
          });
          
          // Apply large bottom padding to force journey into visible top area
          mapInstanceRef.current!.fitBounds(bounds, {
            top: 60,                    // Top padding
            right: 60,                  // Right padding  
            bottom: panelHeightPx + 150, // LARGE bottom padding to push journey UP into visible area
            left: 60                    // Left padding
          });
        } else {
          console.log('🚫 Skipping auto-fit bounds (in pin mode - user is positioning)');
        }
      } else {
        console.error('❌ Route calculation failed:', status);
      }
    });
  }, [pickup?.coordinates, destination?.coordinates, isMapLoaded, isPinMode]);

  // Debug coordinates to verify they're being received
  useEffect(() => {
    console.log('📍 SimpleBookingMap received coordinates:', {
      pickup: pickup?.coordinates,
      destination: destination?.coordinates
    });
  }, [pickup?.coordinates, destination?.coordinates]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading Map...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />

      {/* Static red crosshair pin in center - only show when onCenterChanged provided */}
      {onCenterChanged && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-4xl text-red-500" style={{ 
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.6))',
            fontSize: '48px'
          }}>
            📍
          </div>
        </div>
      )}

      {/* Price overlay */}
      {currentPrice && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 z-10">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Estimated Price</div>
          <div className="text-lg font-bold text-green-600">£{currentPrice.toFixed(2)}</div>
        </div>
      )}

      {/* Center pin instruction */}
      {onCenterChanged && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10">
          Move map to adjust pin location
        </div>
      )}
    </div>
  );
}