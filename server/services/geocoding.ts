interface GeocodeResult {
  lat: number;
  lng: number;
}

interface ReverseGeocodeResult {
  address: string;
  formattedAddress: string;
  street_number?: string;
  route?: string;
  locality?: string;
  postal_town?: string;
  postal_code?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

    
    if (!GOOGLE_API_KEY) {
      console.error('❌ Google Maps API key not found');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&region=uk&result_type=street_address|premise|subpremise`;

    console.log(`🔄 Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const formattedAddress = result.formatted_address;
      
      // Extract street number and name, city, postcode
      const components = result.address_components;
      let streetNumber = '';
      let streetName = '';
      let city = '';
      let postcode = '';
      
      for (const component of components) {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          streetName = component.long_name;
        } else if (types.includes('postal_town') || types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('postal_code')) {
          postcode = component.long_name;
        }
      }
      
      // Create clean address format: "21 East Street, Canterbury, CT1 1ED"
      const cleanAddress = [
        streetNumber && streetName ? `${streetNumber} ${streetName}` : streetName || formattedAddress.split(',')[0],
        city,
        postcode
      ].filter(Boolean).join(', ');
      
      console.log(`📍 Reverse geocoding successful: ${lat}, ${lng} → ${cleanAddress}`);
      return {
        address: cleanAddress,
        formattedAddress: formattedAddress,
        street_number: streetNumber,
        route: streetName,
        locality: city,
        postal_town: city,
        postal_code: postcode
      };
    } else {
      console.error(`❌ Reverse geocoding failed for: ${lat}, ${lng}`, data.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.error('❌ Google Maps API key not found');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}&region=uk&components=country:UK`;

    console.log(`🗺️ Geocoding address: ${address}`);
    
    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coords = { lat: location.lat, lng: location.lng };
      
      console.log(`📍 Geocoding successful (Canterbury prioritized): ${address} → ${JSON.stringify(coords)}`);
      return coords;
    } else {
      console.error(`❌ Geocoding failed for: ${address}`, data.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}