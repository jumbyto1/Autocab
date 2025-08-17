import { Button } from "@/components/ui/button";

interface StaticMapProps {
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

export function StaticMap({ coordinates, addresses }: StaticMapProps) {
  const openInGoogleMaps = () => {
    if (!coordinates.pickup || !coordinates.destination) return;
    
    let url = `https://www.google.com/maps/dir/${coordinates.pickup.lat},${coordinates.pickup.lng}`;
    
    // Add via points
    coordinates.viaPoints.forEach(point => {
      url += `/${point.lat},${point.lng}`;
    });
    
    url += `/${coordinates.destination.lat},${coordinates.destination.lng}`;
    window.open(url, '_blank');
  };

  const generateStaticMapUrl = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !coordinates.pickup || !coordinates.destination) return null;

    const size = "400x300";
    const zoom = "10";
    
    // Build markers
    let markers = "";
    
    // Pickup marker (green)
    if (coordinates.pickup) {
      markers += `&markers=color:green|label:P|${coordinates.pickup.lat},${coordinates.pickup.lng}`;
    }
    
    // Via points (blue)
    coordinates.viaPoints.forEach((point, index) => {
      markers += `&markers=color:blue|label:${index + 1}|${point.lat},${point.lng}`;
    });
    
    // Destination marker (red)
    if (coordinates.destination) {
      markers += `&markers=color:red|label:D|${coordinates.destination.lat},${coordinates.destination.lng}`;
    }

    // Build path
    let path = "";
    if (coordinates.pickup && coordinates.destination) {
      path = `&path=color:0x3B82F6|weight:4|${coordinates.pickup.lat},${coordinates.pickup.lng}`;
      
      coordinates.viaPoints.forEach(point => {
        path += `|${point.lat},${point.lng}`;
      });
      
      path += `|${coordinates.destination.lat},${coordinates.destination.lng}`;
    }

    return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&zoom=${zoom}${markers}${path}&key=${apiKey}`;
  };

  const staticMapUrl = generateStaticMapUrl();

  return (
    <div className="space-y-3">
      <div className="h-64 w-full bg-gray-100 rounded-lg border overflow-hidden">
        {staticMapUrl ? (
          <img 
            src={staticMapUrl} 
            alt="Route Map" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        <div className={`h-full flex items-center justify-center text-gray-500 ${staticMapUrl ? 'hidden' : ''}`}>
          <div className="text-center">
            <div className="text-sm font-medium">Route Map</div>
            <div className="text-xs mt-1">
              {coordinates.pickup && coordinates.destination 
                ? "Displaying route with coordinates" 
                : "Enter pickup and destination to view map"}
            </div>
          </div>
        </div>
      </div>
      
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