import React, { useEffect, useRef, useState } from 'react';

interface Vehicle {
  id: number;
  callsign: string;
  lat: number;
  lng: number;
  status: string;
  statusDescription: string;
  driverName: string;
  zone: string;
  shiftDuration: number;
  totalBookings: number;
}

interface UltraFastMapProps {
  vehicles: Vehicle[];
  selectedStatus: string;
}

const UltraFastMap: React.FC<UltraFastMapProps> = ({ vehicles, selectedStatus }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  // Get status color for markers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
      case 'GREEN':
        return '#22c55e'; // Green
      case 'GoingToJob':
      case 'YELLOW':
        return '#eab308'; // Yellow
      case 'InJob':
      case 'RED':
        return '#ef4444'; // Red
      case 'OnBreak':
      case 'GRAY':
      default:
        return '#6b7280'; // Gray
    }
  };

  // Filter vehicles by selected status
  const filteredVehicles = vehicles.filter(vehicle => {
    if (selectedStatus === 'ALL') return true;
    return vehicle.status === selectedStatus;
  });

  // Initialize Google Maps with ultra-fast loading
  useEffect(() => {
    let mounted = true;

    const loadGoogleMaps = async () => {
      try {
        console.log('🚀 ULTRA-FAST MAP: Starting initialization...');

        // Get API key first
        const response = await fetch('/api/config');
        const config = await response.json();
        const key = config.GOOGLE_API_KEY;
        
        if (!key) {
          console.error('❌ ULTRA-FAST MAP: No API key');
          return;
        }

        setApiKey(key);

        // Check if Google Maps is already loaded
        if (window.google?.maps) {
          console.log('✅ ULTRA-FAST MAP: Google Maps already loaded');
          createMap();
          return;
        }

        // Remove any existing scripts to prevent conflicts
        const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        existingScripts.forEach(script => script.remove());

        console.log('🗺️ ULTRA-FAST MAP: Loading Google Maps script...');

        // Create unique callback
        const callbackName = `ultraFastMapCallback_${Date.now()}`;
        
        // Set callback
        (window as any)[callbackName] = () => {
          console.log('✅ ULTRA-FAST MAP: Google Maps loaded successfully');
          if (mounted) {
            createMap();
          }
          delete (window as any)[callbackName];
        };

        // Load script with optimized settings
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly&callback=${callbackName}`;
        script.async = false; // Synchronous for reliability
        script.defer = false;
        
        script.onload = () => {
          console.log('🗺️ ULTRA-FAST MAP: Script loaded');
        };
        
        script.onerror = () => {
          console.error('❌ ULTRA-FAST MAP: Script failed to load');
        };

        document.head.appendChild(script);

      } catch (error) {
        console.error('❌ ULTRA-FAST MAP: Initialization error:', error);
      }
    };

    const createMap = () => {
      if (!mapRef.current || !window.google?.maps) {
        console.log('🗺️ ULTRA-FAST MAP: Prerequisites not ready');
        return;
      }

      if (mapInstanceRef.current) {
        console.log('🗺️ ULTRA-FAST MAP: Map already exists');
        return;
      }

      try {
        console.log('🗺️ ULTRA-FAST MAP: Creating map instance...');

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 11,
          center: { lat: 51.2802, lng: 1.0789 }, // Canterbury
          mapTypeId: 'roadmap',
          gestureHandling: 'cooperative',
          disableDefaultUI: false,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          scaleControl: true,
          zoomControl: true,
          maxZoom: 18,
          minZoom: 8
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);

        console.log('✅ ULTRA-FAST MAP: Map created successfully');

        // Add idle event for final confirmation
        window.google.maps.event.addListenerOnce(map, 'idle', () => {
          console.log('✅ ULTRA-FAST MAP: Map is interactive and ready');
        });

      } catch (error) {
        console.error('❌ ULTRA-FAST MAP: Map creation failed:', error);
      }
    };

    loadGoogleMaps();

    return () => {
      mounted = false;
    };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    console.log(`🗺️ ULTRA-FAST MAP: Adding ${filteredVehicles.length} markers`);

    // Add new markers
    const bounds = new window.google.maps.LatLngBounds();
    
    filteredVehicles.forEach(vehicle => {
      const position = { lat: vehicle.lat, lng: vehicle.lng };
      
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `Vehicle ${vehicle.callsign} - ${vehicle.driverName}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getStatusColor(vehicle.status),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Add click event for vehicle info
      marker.addListener('click', () => {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Vehicle ${vehicle.callsign}</h3>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Driver:</strong> ${vehicle.driverName}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${vehicle.statusDescription}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Zone:</strong> ${vehicle.zone}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Shift:</strong> ${typeof vehicle.shiftDuration === 'number' ? vehicle.shiftDuration.toFixed(1) : '0'}h</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Bookings:</strong> ${vehicle.totalBookings}</p>
            </div>
          `
        });

        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Fit map to show all vehicles
    if (filteredVehicles.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      
      // Set minimum zoom to avoid over-zooming
      const listener = window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        if (mapInstanceRef.current!.getZoom()! > 15) {
          mapInstanceRef.current!.setZoom(15);
        }
      });
    }

  }, [filteredVehicles, isMapReady]);

  return (
    <div className="w-full h-full relative">
      {/* Map container */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Loading overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading Ultra-Fast Map...</p>
          </div>
        </div>
      )}
      
      {/* Map status indicator */}
      {isMapReady && (
        <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow text-xs">
          <span className="text-green-600">●</span> Map Ready ({filteredVehicles.length} vehicles)
        </div>
      )}
    </div>
  );
};

export default UltraFastMap;