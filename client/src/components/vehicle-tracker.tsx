import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadGoogleMapsAPI } from '@/lib/google-maps-loader';

interface Vehicle {
  id: string;
  callsign: string;
  driverName: string;
  driverCallsign: string;
  status: 'RED' | 'YELLOW' | 'GREEN';
  statusDescription: string;
  latitude: number;
  longitude: number;
  totalBookings: number;
  shiftDuration: number;
  lastUpdate: string;
  dataSource: 'LIVE_GPS' | 'HOME_ADDRESS';
}

interface VehicleTrackerResponse {
  success: boolean;
  vehicles: Vehicle[];
}

declare global {
  interface Window {
    google: any;
  }
}

export function VehicleTracker() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Fetch vehicle data with ultra-optimized settings for fast map loading
  const { data: vehicleData, isLoading } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 120000, // Update every 2 minutes for ultra-fast performance
    staleTime: 60000, // Data considered fresh for 1 minute
  });

  // Limit to 5 vehicles maximum for ultra-fast map loading and performance
  const allVehicles: Vehicle[] = (vehicleData as VehicleTrackerResponse)?.vehicles || [];
  const vehicles: Vehicle[] = allVehicles.slice(0, 5); // Show only first 5 vehicles for speed

  // Simple Google Maps initialization
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsAPI();
        setIsMapReady(true);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    if (mapRef.current && !isMapReady) {
      initializeMap();
    }
  }, [isMapReady]);

  // Initialize Google Maps when ready
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.google?.maps?.Map) return;

    try {
      console.log('🗺️ Initializing Google Maps instance...');
      
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 51.2802, lng: 1.0789 }, // Canterbury center
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;
      console.log('✅ Google Maps initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing Google Maps:', error);
    }
  }, [isMapReady]);

  // Add vehicle markers with color coding
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || vehicles.length === 0) {
      console.log(`🗺️ Map status: ready=${isMapReady}, map=${!!mapInstanceRef.current}, vehicles=${vehicles.length}`);
      return;
    }

    console.log(`🚗 Adding ${vehicles.length} vehicle markers to map`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    const markers: any[] = [];

    vehicles.forEach((vehicle, index) => {
      console.log(`📍 Adding marker ${index + 1}: Vehicle ${vehicle.callsign} at ${vehicle.latitude}, ${vehicle.longitude}`);
      
      // Color based on vehicle status
      const markerColor = vehicle.status === 'RED' ? '#DC2626' : 
                         vehicle.status === 'YELLOW' ? '#F59E0B' : '#16A34A';

      // Create marker element with modern AdvancedMarkerElement (fixes deprecation warning)
      const markerElement = document.createElement('div');
      markerElement.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: ${markerColor}; border: 2px solid white;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: bold; font-size: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      markerElement.textContent = vehicle.callsign;

      // Use AdvancedMarkerElement if available, fallback to Marker for compatibility
      const marker = window.google?.maps?.marker?.AdvancedMarkerElement ? 
        new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: vehicle.latitude, lng: vehicle.longitude },
          map: mapInstanceRef.current,
          title: `Vehicle ${vehicle.callsign} - ${vehicle.driverName}`,
          content: markerElement
        }) :
        new window.google.maps.Marker({
          position: { lat: vehicle.latitude, lng: vehicle.longitude },
          map: mapInstanceRef.current,
          title: `Vehicle ${vehicle.callsign} - ${vehicle.driverName}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });

      // Click handler to show vehicle details
      marker.addListener('click', () => {
        setSelectedVehicle(vehicle);
      });

      markers.push(marker);
      bounds.extend({ lat: vehicle.latitude, lng: vehicle.longitude });
    });

    markersRef.current = markers;
    console.log(`✅ Added ${markers.length} map elements (markers + labels)`);

    // Auto-adjust map bounds to show all vehicles
    if (vehicles.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
      console.log('🎯 Map bounds adjusted to show all vehicles');
    }
  }, [vehicles, isMapReady]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Vehicle Status Legend */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-600"></div>
          <span className="text-sm">In Job LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-sm">Going to Client</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-600"></div>
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span className="text-sm">Offline</span>
        </div>
        <div className="ml-auto text-sm text-gray-600">
          {vehicles.length} vehicles total
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Vehicle Details Panel */}
        {selectedVehicle && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Vehicle {selectedVehicle.callsign}</h3>
              <button 
                onClick={() => setSelectedVehicle(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Driver:</span>
                <span className="font-medium">{selectedVehicle.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Driver Callsign:</span>
                <span className="font-medium">{selectedVehicle.driverCallsign}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  selectedVehicle.status === 'RED' ? 'text-red-600' :
                  selectedVehicle.status === 'YELLOW' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {selectedVehicle.statusDescription}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Bookings:</span>
                <span className="font-medium">{selectedVehicle.totalBookings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shift Duration:</span>
                <span className="font-medium">{selectedVehicle.shiftDuration}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Source:</span>
                <span className="font-medium">
                  {selectedVehicle.dataSource === 'LIVE_GPS' ? '🎯 Live GPS' : '🏠 Home Address'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}