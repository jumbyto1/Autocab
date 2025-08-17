// Google Maps API configuration and utilities

export interface GoogleMapsConfig {
  apiKey: string;
  libraries: string[];
  version: string;
}

// Load Google Maps API script
export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already loading - remove existing scripts to prevent conflicts
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.remove();
      console.log('🔄 Removed existing Google Maps script to prevent conflicts');
    }

    try {
      // Get API key from backend config
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      
      if (!config.GOOGLE_API_KEY) {
        reject(new Error('Google Maps API key not available'));
        return;
      }

      // Create and load the script with marker library for AdvancedMarkerElement
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_API_KEY}&libraries=places,geometry,marker&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          reject(new Error('Google Maps failed to load properly'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      reject(new Error('Failed to fetch API config'));
    }
  });
};

// Default map configuration
export const defaultMapConfig = {
  zoom: 13,
  center: { lat: 51.2802, lng: 1.0789 }, // Canterbury center
  mapTypeId: 'roadmap' as const,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  gestureHandling: 'cooperative' as const,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Marker color configurations
export const markerColors = {
  pickup: '#22c55e',    // Green
  destination: '#ef4444', // Red
  via: '#3b82f6'        // Blue
};

// Create custom advanced marker with number (using modern AdvancedMarkerElement)
export const createCustomMarker = async (
  position: google.maps.LatLngLiteral,
  title: string,
  color: string,
  number?: string,
  map?: google.maps.Map
): Promise<google.maps.marker.AdvancedMarkerElement> => {
  // Import the marker library for AdvancedMarkerElement
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  
  // Create a custom pin element with color and optional number
  const pinElement = new PinElement({
    background: color,
    borderColor: '#FFFFFF',
    glyphColor: '#FFFFFF',
    glyph: number || '',
    scale: 1.2
  });

  // Create the advanced marker
  return new AdvancedMarkerElement({
    map,
    position,
    title,
    content: pinElement.element
  });
};

// Fallback function for legacy compatibility
export const createLegacyMarker = (
  position: google.maps.LatLngLiteral,
  title: string,
  color: string,
  number?: string
): google.maps.Marker => {
  const pinSVG = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      ${number ? `<text x="16" y="21" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${color}">${number}</text>` : ''}
    </svg>
  `;
  
  const icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSVG)}`,
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40)
  };

  return new google.maps.Marker({
    position,
    title,
    icon
  });
};

// Calculate bounds for multiple points
export const calculateBounds = (points: google.maps.LatLngLiteral[]): google.maps.LatLngBounds => {
  const bounds = new google.maps.LatLngBounds();
  points.forEach(point => bounds.extend(point));
  return bounds;
};

// Create directions service
export const createDirectionsService = () => new google.maps.DirectionsService();
export const createDirectionsRenderer = (options?: google.maps.DirectionsRendererOptions) => 
  new google.maps.DirectionsRenderer({
    suppressMarkers: true, // We'll use custom markers
    polylineOptions: {
      strokeColor: '#3b82f6',
      strokeWeight: 4,
      strokeOpacity: 0.8
    },
    ...options
  });

// Geocoding utilities
export const geocodeAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
  if (!window.google?.maps) {
    throw new Error('Google Maps not loaded');
  }

  const geocoder = new google.maps.Geocoder();
  
  try {
    const result = await geocoder.geocode({ 
      address,
      region: 'UK',
      componentRestrictions: { country: 'GB' }
    });
    
    if (result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return { lat: location.lat(), lng: location.lng() };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
};

// Window interface extension for Google Maps
declare global {
  interface Window {
    google: any;
  }
}