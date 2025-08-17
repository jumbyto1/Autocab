import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpandIcon, MapPin, Clock, Banknote } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { SimpleMap } from "./simple-map";

interface RouteMapProps {
  pickup?: string;
  destination?: string;
  via1?: string;
  via2?: string;
  via3?: string;
  via4?: string;
  via5?: string;
}

interface RouteData {
  distance: string;
  duration: string;
  estimatedPrice: string;
  waypoints: number;
  coordinates: {
    pickup: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
    viaPoints: { lat: number; lng: number }[];
  };
}

export function RouteMap({ pickup, destination, via1, via2, via3, via4, via5 }: RouteMapProps) {
  const [routeData, setRouteData] = useState<RouteData>({
    distance: "N/A",
    duration: "N/A", 
    estimatedPrice: "N/A",
    waypoints: 0,
    coordinates: {
      pickup: null,
      destination: null,
      viaPoints: []
    }
  });
  
  const [showFullMap, setShowFullMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const calculateRouteData = async () => {
    if (!pickup || !destination) {
      setRouteData({
        distance: "N/A",
        duration: "N/A",
        estimatedPrice: "N/A", 
        waypoints: 0,
        coordinates: {
          pickup: null,
          destination: null,
          viaPoints: []
        }
      });
      return;
    }

    try {
      const viaPoints = [via1, via2, via3, via4, via5].filter(Boolean);
      
      const response = await fetch("/api/route/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup,
          destination,
          viaPoints
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🗺️ ROUTE DATA RECEIVED:", data);
        console.log('Route calculation response:', data);
        setRouteData({
          distance: data.distance || "N/A",
          duration: data.duration || "N/A",
          estimatedPrice: data.estimatedPrice || "N/A",
          waypoints: viaPoints.length,
          coordinates: data.coordinates || {
            pickup: null,
            destination: null,
            viaPoints: []
          }
        });
      } else {
        console.error('Route calculation failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Route calculation error:", error);
    }
  };

  const openGoogleMapsRoute = () => {
    if (!routeData.coordinates.pickup || !routeData.coordinates.destination) {
      alert("Coordinates not available for mapping");
      return;
    }

    const { pickup: origin, destination, viaPoints } = routeData.coordinates;
    
    // Create Google Maps URL with coordinates
    let mapUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}`;
    
    // Add via points
    viaPoints.forEach(point => {
      mapUrl += `/${point.lat},${point.lng}`;
    });
    
    // Add destination
    mapUrl += `/${destination.lat},${destination.lng}`;
    
    window.open(mapUrl, '_blank');
  };

  useEffect(() => {
    calculateRouteData();
  }, [pickup, destination, via1, via2, via3, via4, via5]);

  const viaPointsCount = [via1, via2, via3, via4, via5].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Compact Route Information */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 text-sm">Route Information</h4>
            <Button 
              variant="secondary" 
              size="sm" 
              className="text-xs h-6"
              onClick={openGoogleMapsRoute}
              disabled={!routeData.coordinates.pickup || !routeData.coordinates.destination}
            >
              <ExpandIcon className="w-3 h-3 mr-1" />
              View Map
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-2">
          {/* Ultra-Compact Route Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 p-1.5 rounded border-2 border-blue-300">
              <div className="flex items-center justify-center mb-0.5">
                <MapPin className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-800">{routeData.distance}</div>
              <div className="text-xs text-blue-600">Distance</div>
            </div>
            
            <div className="bg-green-50 p-1.5 rounded border-2 border-green-300">
              <div className="flex items-center justify-center mb-0.5">
                <Clock className="w-3 h-3 text-green-600" />
              </div>
              <div className="text-xs font-semibold text-green-800">{routeData.duration}</div>
              <div className="text-xs text-green-600">Duration</div>
            </div>
            
            <div className="bg-orange-50 p-1.5 rounded border-2 border-orange-300">
              <div className="flex items-center justify-center mb-0.5">
                <Banknote className="w-3 h-3 text-orange-600" />
              </div>
              <div className="text-xs font-semibold text-orange-800" data-route-estimate>{routeData.estimatedPrice}</div>
              <div className="text-xs text-orange-600">Estimate</div>
            </div>
          </div>

          {/* Pickup Address Only */}
          <div className="mt-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="text-gray-600 truncate">{pickup || "Not specified"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Information with Map */}
      <div className="flex-1 mt-4">
        <Card className="h-full">
          <CardHeader className="bg-gray-50 border-b border-gray-200 py-2">
            <h4 className="font-semibold text-gray-900 text-sm flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Trip Information
            </h4>
          </CardHeader>
          
          <CardContent className="p-0 h-full flex flex-col">
            {/* Interactive Google Map - Full Size */}
            <div className="flex-1">
              <SimpleMap 
                coordinates={routeData.coordinates}
                addresses={{
                  pickup: pickup || '',
                  destination: destination || '',
                  viaPoints: [via1, via2, via3, via4, via5].filter((v): v is string => Boolean(v))
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}