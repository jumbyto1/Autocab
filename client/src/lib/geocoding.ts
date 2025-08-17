// Geocoding utilities for reverse address lookup
export interface LocationInfo {
  street: string;
  city: string;
  error?: string;
}

// Cache for geocoding results to avoid repeated API calls
const geocodingCache = new Map<string, LocationInfo>();

export async function reverseGeocode(lat: number, lng: number): Promise<LocationInfo> {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          resolve(results);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });

    const addressComponents = result[0].address_components;
    
    // Extract street name and city
    let street = 'N/A';
    let city = 'N/A';

    // Find street name (route)
    const streetComponent = addressComponents.find(comp => 
      comp.types.includes('route') || comp.types.includes('street_address')
    );
    if (streetComponent) {
      street = streetComponent.long_name;
    }

    // Find city/town (locality or administrative_area_level_2)
    const cityComponent = addressComponents.find(comp => 
      comp.types.includes('locality') || 
      comp.types.includes('postal_town') ||
      comp.types.includes('administrative_area_level_2')
    );
    if (cityComponent) {
      city = cityComponent.long_name;
    }

    const locationInfo: LocationInfo = { street, city };
    
    // Cache the result
    geocodingCache.set(cacheKey, locationInfo);
    
    return locationInfo;
  } catch (error) {
    const fallbackInfo: LocationInfo = {
      street: 'N/A',
      city: 'N/A',
      error: 'Geocoding failed'
    };
    
    // Cache the fallback to avoid repeated failures
    geocodingCache.set(cacheKey, fallbackInfo);
    
    return fallbackInfo;
  }
}

// Clear cache when it gets too large
export function clearGeocodingCache() {
  geocodingCache.clear();
}