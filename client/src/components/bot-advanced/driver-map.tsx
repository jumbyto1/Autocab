import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AutocabDriver {
  id: number;
  callsign: string;
  name: string;
  status: string;
  vehicle: string;
  hasGPS: boolean;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: string | null;
  isOnLiveShift: boolean;
  shiftStarted: string | null;
  totalBookings: number;
  vehicleStatus?: 'RED' | 'YELLOW' | 'GREEN';
  statusDescription?: string;
  dataSource?: 'LIVE_GPS' | 'HOME_ADDRESS';
  shiftDurationHours?: number;
}

interface DriversResponse {
  success: boolean;
  drivers: AutocabDriver[];
}

declare global {
  interface Window {
    google: any;
    initDriverMap: () => void;
    initGoogleMaps: () => void;
  }
}

export function DriverMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchCallsign, setSearchCallsign] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Fetch drivers data
  const { data: driversData, isLoading: driversLoading } = useQuery({
    queryKey: ['/api/drivers'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const drivers: AutocabDriver[] = (driversData as DriversResponse)?.drivers || [];
  
  // Filter drivers with GPS coordinates (both live GPS and home addresses)
  let driversWithGPS = drivers.filter((driver: AutocabDriver) => 
    driver.latitude && driver.longitude
  );

  // Apply search filter if active
  if (isSearchActive && searchCallsign.trim()) {
    driversWithGPS = driversWithGPS.filter((driver: AutocabDriver) => 
      driver.callsign.toLowerCase().includes(searchCallsign.toLowerCase()) ||
      driver.name.toLowerCase().includes(searchCallsign.toLowerCase())
    );
  }
  
  // Debug data structure
  console.log('🔍 DriversData:', { driversCount: drivers.length, withGPS: driversWithGPS.length });

  // Initialize Google Maps
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google?.maps) {
        console.log('🗺️ Google Maps already loaded, initializing map...');
        initializeMap();
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        console.log('🗺️ Google Maps script already loading, waiting...');
        const checkGoogle = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkGoogle);
            initializeMap();
          }
        }, 100);
        return;
      }

      console.log('🗺️ Loading Google Maps API...');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.warn('🗺️ Google Maps API key not found');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      // Global callback for when Google Maps loads
      window.initGoogleMaps = () => {
        console.log('🗺️ Google Maps API loaded via callback');
        initializeMap();
      };
      
      script.onerror = () => {
        console.error('🗺️ Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      console.log('🗺️ Initializing Google Maps...');
      
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 7, // Wider zoom to show real coordinates across England
        center: { lat: 51.5, lng: 0.0 }, // Center of England for better coverage
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
      console.log('✅ Google Maps initialized successfully');
    };

    loadGoogleMaps();
  }, []);

  // Add markers when map is ready and drivers data changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || driversWithGPS.length === 0) {
      return;
    }

    console.log(`🗺️ Adding ${driversWithGPS.length} drivers with GPS to map`);
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    // Create bounds to fit all markers
    const bounds = new window.google.maps.LatLngBounds();
    
    // Add new markers
    driversWithGPS.forEach((driver: AutocabDriver) => {
      if (!driver.latitude || !driver.longitude) return;

      const position = new window.google.maps.LatLng(driver.latitude, driver.longitude);
      
      // Extend bounds to include this marker
      bounds.extend(position);
      
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `${driver.callsign} - ${driver.name}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: driver.isOnLiveShift ? '#22c55e' : '#3b82f6', // Green for live shifts, blue for home addresses
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12,
        },
        label: {
          text: driver.callsign,
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold'
        }
      });

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${driver.callsign}</h3>
            <p style="margin: 0 0 2px 0; font-size: 12px; color: #666;">${driver.name}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;">Vehicle: ${driver.vehicle || 'N/A'}</p>
            <span style="padding: 2px 6px; font-size: 11px; border-radius: 4px; background-color: ${
              driver.isOnLiveShift ? '#dcfce7' : '#fee2e2'
            }; color: ${driver.isOnLiveShift ? '#166534' : '#991b1b'};">
              ${driver.status}
            </span>
            ${driver.lastUpdate ? `
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">
                Last update: ${new Date(driver.lastUpdate).toLocaleTimeString()}
              </p>
            ` : ''}
            ${driver.isOnLiveShift ? `
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #2563eb;">
                ${driver.totalBookings} bookings today
              </p>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Auto-adjust map bounds to show all drivers across England
    if (markersRef.current.length > 0 && !bounds.isEmpty()) {
      console.log('🎯 Auto-adjusting bounds to show all drivers across England');
      mapInstanceRef.current.fitBounds(bounds);
      
      // Add some padding around the bounds
      const boundsListener = window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
        const currentZoom = mapInstanceRef.current.getZoom();
        if (currentZoom > 8) {
          mapInstanceRef.current.setZoom(8);
        }
      });
      
      // Set maximum zoom limit
      const idleListener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
        if (mapInstanceRef.current.getZoom() > 13) {
          mapInstanceRef.current.setZoom(13);
        }
        window.google.maps.event.removeListener(idleListener);
      });
    }

    console.log(`✅ Added ${markersRef.current.length} markers to map`);
    
    // Final verification
    if (markersRef.current.length > 0) {
      const firstMarker = markersRef.current[0];
      console.log('🎯 FINAL VERIFICATION:', {
        totalMarkers: markersRef.current.length,
        firstMarkerHasMap: firstMarker.getMap() !== null,
        mapInstanceValid: mapInstanceRef.current !== null,
        driversWithGPS: driversWithGPS.length
      });
    }
  }, [isMapReady, driversWithGPS.length, driversData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];
    };
  }, []);

  if (driversLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading drivers...</p>
        </div>
      </div>
    );
  }

  const handleSearch = () => {
    setIsSearchActive(true);
  };

  const handleClearSearch = () => {
    setSearchCallsign('');
    setIsSearchActive(false);
  };

  const foundDriver = isSearchActive && searchCallsign.trim() ? 
    driversWithGPS.find(d => 
      d.callsign.toLowerCase().includes(searchCallsign.toLowerCase()) ||
      d.name.toLowerCase().includes(searchCallsign.toLowerCase())
    ) : null;

  return (
    <div className="space-y-4">
      {/* Driver Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Live Driver Tracking</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Caută driver (callsign sau nume)..."
            value={searchCallsign}
            onChange={(e) => setSearchCallsign(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          >
            🔍 Caută
          </button>
          {isSearchActive && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium"
            >
              ✕ Reset
            </button>
          )}
        </div>
        
        {/* Search Results */}
        {isSearchActive && searchCallsign.trim() && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            {foundDriver ? (
              <div className="text-sm">
                <div className="font-medium text-green-600 dark:text-green-400">
                  ✅ Driver găsit: {foundDriver.callsign} - {foundDriver.name}
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  Status: {foundDriver.isOnLiveShift ? '🟢 Live GPS' : '🔵 Home Address'} • 
                  Coordonate: {typeof foundDriver.latitude === 'number' ? foundDriver.latitude.toFixed(4) : 'N/A'}, {typeof foundDriver.longitude === 'number' ? foundDriver.longitude.toFixed(4) : 'N/A'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600 dark:text-red-400">
                ❌ Nu s-a găsit driver cu "{searchCallsign}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="h-96 w-full rounded-lg border border-gray-200 dark:border-gray-700"
          style={{ minHeight: '384px' }}
        />
        
        {/* Overlay for map status */}
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          </div>
        )}
        
        {isMapReady && driversWithGPS.length === 0 && (
          <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No drivers with GPS coordinates available
            </p>
          </div>
        )}
      </div>

      {/* Real GPS Status Panel */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          {isSearchActive && searchCallsign.trim() ? 'Search Results' : 'Real GPS Tracking Status'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {isSearchActive ? driversWithGPS.filter(d => d.isOnLiveShift).length : drivers.filter(d => d.isOnLiveShift).length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Live GPS Tracking</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isSearchActive ? 
                driversWithGPS.length - driversWithGPS.filter(d => d.isOnLiveShift).length :
                driversWithGPS.length - drivers.filter(d => d.isOnLiveShift).length
              }
            </div>
            <div className="text-gray-600 dark:text-gray-400">Home Addresses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {driversWithGPS.length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {isSearchActive && searchCallsign.trim() ? 'Filtered Results' : 'Total on Map'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Live GPS coordinates from active drivers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Real home addresses from Autocab API</span>
          </div>
          {isSearchActive && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Search mode active - showing filtered results</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}