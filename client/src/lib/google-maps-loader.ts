// Simple working Google Maps loader
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadGoogleMapsAPI(): Promise<void> {
  if (isLoaded && window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      // Get API key from backend with error handling
      let apiKey: string;
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`Config fetch failed: ${response.status}`);
        }
        const config = await response.json();
        apiKey = config.GOOGLE_API_KEY;
      } catch (configError) {
        console.warn('API key fetch failed:', configError);
        reject(new Error('Google Maps API key not available from backend'));
        return;
      }

      if (!apiKey) {
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      // Check if already loaded
      if (window.google?.maps?.Map) {
        isLoaded = true;
        resolve();
        return;
      }

      // Load the script with Places API and Marker library for AdvancedMarkerElement
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly&loading=async&callback=initializeGoogleMaps`;
      script.async = true; // Async loading for better performance
      script.defer = false; // Direct loading for stability
      
      // Create global callback for mobile compatibility
      (window as any).initializeGoogleMaps = () => {
        console.log('Google Maps API callback triggered');
        isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject(new Error('Failed to load Google Maps API'));
      };
      
      // Fallback timeout for mobile devices
      setTimeout(() => {
        if (!isLoaded && window.google?.maps?.Map) {
          console.log('Google Maps API loaded via fallback detection');
          isLoaded = true;
          resolve();
        }
      }, 3000);

      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });

  return loadPromise;
}