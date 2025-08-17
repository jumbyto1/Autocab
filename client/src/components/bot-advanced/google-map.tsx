import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadGoogleMapsAPI as loadGoogleMapsAPISecure } from "@/lib/google-maps-loader";

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface GoogleMapProps {
  coordinates: {
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

// Convert Autocab coordinate format to Google Maps format
function convertCoordinate(coord: any): { lat: number; lng: number } | null {
  if (!coord) return null;
  
  // Handle both formats: {lat, lng} and {latitude, longitude}
  if (coord.latitude !== undefined && coord.longitude !== undefined) {
    return { lat: coord.latitude, lng: coord.longitude };
  }
  
  if (coord.lat !== undefined && coord.lng !== undefined) {
    return { lat: coord.lat, lng: coord.lng };
  }
  
  return null;
}

export function GoogleMap({ coordinates, addresses }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initializeMap = () => {
    try {
      if (!mapRef.current || !window.google?.maps) {
        setIsLoading(false);
        return;
      }

      // Convert coordinates using helper function
      const pickupCoords = convertCoordinate(coordinates.pickup);
      const destinationCoords = convertCoordinate(coordinates.destination);
      
      // Center map on pickup or default to Canterbury
      const mapCenter = pickupCoords || { lat: 51.2802, lng: 1.0789 };

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: pickupCoords ? 10 : 8,
        center: mapCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });

      setMapInstance(map);
      setIsLoading(false);

      // Add markers if coordinates exist
      if (pickupCoords) {
        new window.google.maps.Marker({
          position: pickupCoords,
          map: map,
          title: 'Pickup Location',
          icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        });
      }

      if (destinationCoords) {
        new window.google.maps.Marker({
          position: destinationCoords,
          map: map,
          title: 'Destination',
          icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });
      }

      // Add via point markers
      coordinates.viaPoints.forEach((point, index) => {
        const viaCoords = convertCoordinate(point);
        if (viaCoords) {
          new window.google.maps.Marker({
            position: viaCoords,
            map: map,
            title: `Via Point ${index + 1}`,
            icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          });
        }
      });

      // Draw route if we have pickup and destination
      if (pickupCoords && destinationCoords) {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // We're adding our own markers
          polylineOptions: {
            strokeColor: '#667eea',
            strokeWeight: 4
          }
        });
        directionsRenderer.setMap(map);

        // Create waypoints from via points
        const waypoints = coordinates.viaPoints
          .map(point => convertCoordinate(point))
          .filter(coord => coord !== null)
          .map(coord => ({ location: coord!, stopover: true }));

        directionsService.route({
          origin: pickupCoords,
          destination: destinationCoords,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true
        }, (result: any, status: any) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
          }
        });
      }

    } catch (error) {
      console.error('Map initialization error:', error);
      setIsLoading(false);
    }
  };



  const displayRoute = (directionsService: any, renderer: any) => {
    if (!coordinates.pickup || !coordinates.destination) return;

    const waypoints = coordinates.viaPoints.map(point => ({
      location: point,
      stopover: true
    }));

    const request = {
      origin: coordinates.pickup,
      destination: coordinates.destination,
      waypoints: waypoints,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    };

    directionsService.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        renderer.setDirections(result);
        console.log('✅ Route displayed successfully');
      } else {
        console.error('❌ Route display failed:', status);
      }
    });
  };

  const loadGoogleMapsAPI = async () => {
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    setIsLoading(true);
    
    try {
      // Use secure API loader from the imported library
      await loadGoogleMapsAPISecure();
      initializeMap();
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load immediately when coordinates become available
    if (coordinates.pickup || coordinates.destination) {
      loadGoogleMapsAPI();
    }
  }, [coordinates.pickup, coordinates.destination]);

  useEffect(() => {
    // Re-initialize map when coordinates change and we have valid data
    if (mapInstance && (coordinates.pickup || coordinates.destination)) {
      // Clear existing map and re-initialize with new coordinates
      initializeMap();
    }
  }, [coordinates]);



  const openInGoogleMaps = () => {
    if (!coordinates.pickup || !coordinates.destination) {
      alert("Coordinates not available for mapping");
      return;
    }

    const { pickup: origin, destination, viaPoints } = coordinates;
    
    let mapUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}`;
    
    viaPoints.forEach(point => {
      mapUrl += `/${point.lat},${point.lng}`;
    });
    
    mapUrl += `/${destination.lat},${destination.lng}`;
    
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="h-64 w-full bg-gray-100 rounded-lg border relative"
        style={{ minHeight: '256px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">Loading Google Maps...</div>
              <div className="text-xs">Please wait</div>
            </div>
          </div>
        )}
        {!isLoading && !mapInstance && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">Loading map...</div>
              <div className="text-xs">Please wait</div>
              <button 
                onClick={() => {
                  setIsLoading(true);
                  loadGoogleMapsAPI();
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* External Map Button */}
      <Button 
        onClick={openInGoogleMaps}
        size="sm" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={!coordinates.pickup || !coordinates.destination}
      >
        Open in Google Maps
      </Button>
    </div>
  );
}