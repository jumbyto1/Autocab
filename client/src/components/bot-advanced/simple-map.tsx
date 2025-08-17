import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink, Users, Car } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface SimpleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  drivers?: AutocabDriver[];
  coordinates?: {
    pickup: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
    viaPoints: { lat: number; lng: number }[];
  };
  addresses: {
    pickup: string;
    destination: string;
    viaPoints: string[];
  };
}

interface AutocabDriver {
  id: string;
  callsign: string;
  fullName: string;
  mobile: string;
  active: boolean;
  suspended: boolean;
  lastPosition?: {
    latitude: number;
    longitude: number;
    timestamp?: string;
  };
}

declare global {
  interface Window {
    google: any;
    initEmbeddedMap: () => void;
  }
}

export function SimpleMap({ coordinates, addresses, center, zoom, drivers }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDrivers, setShowDrivers] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [driversMarkers, setDriversMarkers] = useState<any[]>([]);

  // Fetch drivers from Autocab API
  const { data: driversData, isLoading: driversLoading, error: driversError } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: showDrivers
  });

  const loadGoogleMapsAPI = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API Key check:', apiKey ? 'Found' : 'Missing', apiKey?.substring(0, 10) + '...');
    
    // Don't attempt to load without API key
    if (!apiKey) {
      console.warn('Google Maps API key not found in environment variables');
      setIsLoading(false);
      return;
    }

    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Prevent multiple script loads
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      setTimeout(() => {
        if (window.google?.maps) {
          initializeMap();
        } else {
          setIsLoading(false);
        }
      }, 1000);
      return;
    }

    setIsLoading(true);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setTimeout(initializeMap, 500);
    };
    
    script.onerror = () => {
      setIsLoading(false);
    };

    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('Error initializing map: No map container');
      setIsLoading(false);
      return;
    }

    if (!window.google?.maps) {
      console.error('Error initializing map: Google Maps API not loaded');
      setIsLoading(false);
      return;
    }

    const { pickup, destination, viaPoints = [] } = coordinates || {};
    
    // Validate coordinates
    const isValidCoord = (coord: any) => coord && typeof coord.lat === 'number' && typeof coord.lng === 'number';
    const validPickup = isValidCoord(pickup) ? pickup : null;
    const validDestination = isValidCoord(destination) ? destination : null;
    const validViaPoints = Array.isArray(viaPoints) ? viaPoints.filter(isValidCoord) : [];
    
    // Show map even without coordinates
    console.log("🗺️ INITIALIZING MAP WITH ROUTE DATA:", {
      pickup: validPickup,
      destination: validDestination,
      viaPoints: validViaPoints
    });
    const defaultCenter = validPickup || validDestination || { lat: 51.2802, lng: 1.0789 }; // Canterbury, UK
    
    try {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: validPickup && validDestination ? 10 : 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: []
      });

      // Add markers if coordinates exist
      if (validPickup && validDestination) {
        // Center map between pickup and destination
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(validPickup);
        bounds.extend(validDestination);
        validViaPoints.forEach(point => bounds.extend(point));

        // Add markers like AUTOCAB
        new window.google.maps.Marker({
          position: validPickup,
          map: map,
          title: 'Pickup Location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        });

        new window.google.maps.Marker({
          position: validDestination,
          map: map,
          title: 'Destination',
          icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });

        validViaPoints.forEach((point, index) => {
          new window.google.maps.Marker({
            position: point,
            map: map,
            title: `Via Point ${index + 1}`,
            icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          });
        });

        // Add route line like AUTOCAB
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#1976d2',
            strokeWeight: 4
          }
        });
        directionsRenderer.setMap(map);

        const waypoints = validViaPoints.map(point => ({
          location: point,
          stopover: true
        }));

        directionsService.route({
          origin: validPickup,
          destination: validDestination,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true
        }, (result: any, status: any) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
          }
        });

        map.fitBounds(bounds);
      }
      
      setMapLoaded(true);
      setIsLoading(false);
      setMapInstance(map);
    } catch (error) {
      console.error('Error initializing map:', error);
      console.error('Map container:', mapRef.current);
      console.error('Google Maps API:', !!window.google?.maps);
      console.error('Coordinates:', coordinates);
      setIsLoading(false);
    }
  };

  // Add driver markers to the map
  const addDriversToMap = (drivers: AutocabDriver[]) => {
    if (!mapInstance || !window.google?.maps) return;

    // Clear existing driver markers
    driversMarkers.forEach(marker => marker.setMap(null));
    setDriversMarkers([]);

    const newMarkers: any[] = [];

    drivers.forEach((driver) => {
      // Only show active drivers with valid position data
      if (driver.active && !driver.suspended && driver.lastPosition) {
        const position = {
          lat: driver.lastPosition.latitude,
          lng: driver.lastPosition.longitude
        };

        // Create car icon for driver
        const carIcon = {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 16.5H17.25C17.25 15.94 16.81 15.5 16.25 15.5H15.75C15.19 15.5 14.75 15.94 14.75 16.5H9.25C9.25 15.94 8.81 15.5 8.25 15.5H7.75C7.19 15.5 6.75 15.94 6.75 16.5H6C4.9 16.5 4 15.6 4 14.5V11L6 8H18L20 11V14.5C20 15.6 19.1 16.5 18 16.5ZM19 13.5H16V12.5H19V13.5ZM8 13.5H5V12.5H8V13.5Z" fill="#2563eb"/>
              <circle cx="7" cy="16.5" r="1.5" fill="#1d4ed8"/>
              <circle cx="17" cy="16.5" r="1.5" fill="#1d4ed8"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        };

        const marker = new window.google.maps.Marker({
          position: position,
          map: mapInstance,
          title: `Driver ${driver.callsign}: ${driver.fullName}`,
          icon: carIcon,
          zIndex: 1000
        });

        // Add info window for driver details
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: Arial, sans-serif; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">
                🚕 Driver ${driver.callsign}
              </h3>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Name:</strong> ${driver.fullName}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Mobile:</strong> ${driver.mobile}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> 
                <span style="color: ${driver.active ? '#16a34a' : '#dc2626'};">
                  ${driver.active ? 'Active' : 'Inactive'}
                </span>
              </p>
              ${driver.lastPosition?.timestamp ? `
                <p style="margin: 4px 0; font-size: 11px; color: #666;">
                  Last updated: ${new Date(driver.lastPosition.timestamp).toLocaleTimeString()}
                </p>
              ` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance, marker);
        });

        newMarkers.push(marker);
      }
    });

    setDriversMarkers(newMarkers);
  };

  // Effect to add drivers when data is available
  useEffect(() => {
    const typedDriversData = driversData as { success?: boolean; drivers?: AutocabDriver[] } | undefined;
    if (typedDriversData?.success && typedDriversData.drivers && mapInstance) {
      addDriversToMap(typedDriversData.drivers);
    }
  }, [driversData, mapInstance]);

  useEffect(() => {
    loadGoogleMapsAPI();
  }, [coordinates]);

  const openInGoogleMaps = () => {
    if (!coordinates?.pickup || !coordinates?.destination) return;

    const { pickup: origin, destination, viaPoints } = coordinates;
    let mapUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}`;
    
    viaPoints.forEach((point: { lat: number; lng: number }) => {
      mapUrl += `/${point.lat},${point.lng}`;
    });
    
    mapUrl += `/${destination.lat},${destination.lng}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Map Container */}
      <div className="flex-1 relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-sm">Loading map...</div>
            </div>
          </div>
        )}
        
        <div 
          ref={mapRef} 
          className="w-full h-full rounded-lg"
          style={{ minHeight: '300px' }}
        />
        
        {!mapLoaded && !isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <div className="text-sm">
                {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
                  ? "Google Maps API key required for map display" 
                  : "Map will appear when addresses are entered"
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="mt-2 space-y-2">
        {/* Drivers toggle button */}
        <Button 
          onClick={() => setShowDrivers(!showDrivers)}
          className="w-full"
          variant={showDrivers ? "default" : "outline"}
          size="sm"
          disabled={driversLoading}
        >
          {showDrivers ? (
            <>
              <Users className="h-3 w-3 mr-2" />
              Hide Drivers
              {(driversData as any)?.drivers && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {(driversData as any).drivers.filter((d: any) => d.active && !d.suspended).length}
                </span>
              )}
            </>
          ) : (
            <>
              <Car className="h-3 w-3 mr-2" />
              {driversLoading ? "Loading..." : "Show Drivers"}
            </>
          )}
        </Button>

        {/* External Google Maps link */}
        {coordinates?.pickup && coordinates?.destination && (
          <Button 
            onClick={openInGoogleMaps}
            className="w-full"
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Open in Google Maps
          </Button>
        )}

        {/* Driver status indicator */}
        {showDrivers && (driversData as any)?.drivers && (
          <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-4">
              <span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                {(driversData as any).drivers.filter((d: any) => d.active && !d.suspended).length} Active
              </span>
              <span>
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                {(driversData as any).drivers.filter((d: any) => !d.active || d.suspended).length} Inactive
              </span>
            </div>
          </div>
        )}

        {/* Driver loading/error states */}
        {showDrivers && driversLoading && (
          <div className="text-xs text-gray-500 text-center p-2 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-1"></div>
            Loading driver locations...
          </div>
        )}

        {showDrivers && driversError && (
          <div className="text-xs text-red-500 text-center p-2 bg-red-50 rounded-lg">
            Failed to load drivers. Check Autocab API connection.
          </div>
        )}
      </div>
    </div>
  );
}