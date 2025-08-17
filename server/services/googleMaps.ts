export interface GeocodeResult {
  coordinates: {
    lat: number;
    lng: number;
  };
  formattedAddress: string;
}

export interface RouteResult {
  distance: string;
  duration: string;
  polyline?: string;
}

export class GoogleMapsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const result = data.results[0];
      return {
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        formattedAddress: result.formatted_address
      };
    } catch (error) {
      throw new Error(`Failed to geocode address "${address}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateRoute(
    origin: string,
    destination: string,
    waypoints?: string[]
  ): Promise<RouteResult> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${this.apiKey}`;
      
      if (waypoints && waypoints.length > 0) {
        const waypointsParam = waypoints.map(wp => encodeURIComponent(wp)).join('|');
        url += `&waypoints=${waypointsParam}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Route calculation failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        polyline: route.overview_polyline?.points
      };
    } catch (error) {
      throw new Error(`Failed to calculate route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCoordinates(address: string): Promise<{ lat: number; lng: number }> {
    const result = await this.geocodeAddress(address);
    return result.coordinates;
  }
}