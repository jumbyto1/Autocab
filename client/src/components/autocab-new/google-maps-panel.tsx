import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Google Maps type declarations
declare global {
  interface Window {
    google: typeof google;
  }
  namespace google {
    namespace maps {
      class Map {
        constructor(element: Element, opts?: any);
        addListener(eventName: string, handler: Function): any;
        fitBounds(bounds: any): void;
        setCenter(latlng: any): void;
        setZoom(zoom: number): void;
        getCenter(): any;
        getZoom(): number;
      }
      class Marker {
        constructor(opts?: any);
        setMap(map: Map | null): void;
        addListener(eventName: string, handler: Function): any;
        setAnimation(animation: any): void;
      }
      class InfoWindow {
        constructor(opts?: any);
        open(map: Map, marker?: Marker): void;
        close(): void;
      }
      class LatLngBounds {
        constructor();
        extend(latlng: any): void;
        isEmpty(): boolean;
      }
      class Size {
        constructor(width: number, height: number);
      }
      class Point {
        constructor(x: number, y: number);
      }
      namespace marker {
        class AdvancedMarkerElement {
          constructor(opts?: any);
          addListener(eventName: string, handler: Function): any;
          setMap(map: Map | null): void;
        }
        class PinElement {
          constructor(opts?: any);
          element: Element;
        }
      }
      namespace event {
        function clearInstanceListeners(instance: any): void;
      }
      enum Animation {
        BOUNCE = 1
      }
    }
  }
}



// Create advanced marker using modern Google Maps API
const createAdvancedMarker = async (
  position: google.maps.LatLngLiteral,
  title: string,
  color: string,
  callsign: string,
  map: google.maps.Map
): Promise<google.maps.marker.AdvancedMarkerElement> => {
  // Import the marker library for AdvancedMarkerElement
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  
  // Create a custom pin element with color and callsign
  const pinElement = new PinElement({
    background: color,
    borderColor: '#FFFFFF',
    glyphColor: color === '#22c55e' ? '#000000' : '#FFFFFF', // Black text for green, white for others
    glyph: callsign,
    scale: 1.0
  });

  // Create the advanced marker
  return new AdvancedMarkerElement({
    map,
    position,
    title,
    content: pinElement.element
  });
};

interface Vehicle {
  id: number;
  callsign: string;
  make?: string;
  model?: string;
  registration?: string;
  coordinates?: { lat: number; lng: number };
  status: string;
  statusColor?: string;
  isActive: boolean;
  isSuspended: boolean;
  driverName?: string;
  zone?: string;
  queuePosition?: number;
  shiftStats?: {
    cashJobs: number;
    accountJobs: number;
    totalEarnings: number;
    hoursWorked: number;
  };
}

interface GoogleMapsPanelProps {
  selectedVehicle?: Vehicle | null;
  vehicles?: Vehicle[];
  onVehicleSelect?: (vehicle: Vehicle) => void;
  isFollowing?: boolean;
}

export function GoogleMapsPanel({ selectedVehicle, onVehicleSelect, isFollowing = false }: GoogleMapsPanelProps) {
  // Fetch vehicles from AUTOCAB API - maximum real-time tracking
  // AUTOCAB vehicles query (15-second interval for live data)
  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 15000, // AUTOCAB live data - slower but reliable
  });

  // Test driver query (2-second interval for ultra-fast GPS detection)
  const { data: testDriverData } = useQuery({
    queryKey: ['/api/driver/test/status'],
    refetchInterval: 2000, // Ultra-fast refresh for real-time online/offline detection
  });

  // Combine AUTOCAB vehicles with test drivers
  const autocabVehicles = (vehiclesData as any)?.vehicles || [];
  const testDrivers = (testDriverData as any)?.testDrivers || [];
  const vehicles = [...autocabVehicles, ...testDrivers];
  
  // DEBUG: Log selectedVehicle whenever component renders
  console.log('🔍 GoogleMapsPanel RENDER - selectedVehicle:', selectedVehicle);
  console.log('🔍 GoogleMapsPanel RENDER - vehicles.length:', vehicles.length);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const previousPositionsRef = useRef<Map<number, {lat: number, lng: number, timestamp: number}>>(new Map());
  const trailLinesRef = useRef<Map<number, google.maps.Polyline[]>>(new Map());
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const jobMarkersRef = useRef<google.maps.Marker[]>([]);
  
  // User interaction tracking for position preservation
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [showResetButton, setShowResetButton] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Get Google Maps API key
  const { data: config } = useQuery({
    queryKey: ['/api/config'],
    staleTime: 60000
  });

  // Function to create job point markers (pickup, via, drop off)
  const createJobMarker = (position: google.maps.LatLngLiteral, type: 'pickup' | 'via' | 'dropoff', address: string, map: google.maps.Map): google.maps.Marker => {
    const colors = {
      pickup: '#22c55e',   // Green for pickup
      via: '#f59e0b',      // Orange for via points  
      dropoff: '#3b82f6'   // Blue for drop off
    };

    const labels = {
      pickup: 'P',
      via: 'V',
      dropoff: 'D'
    };

    const markerIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${colors[type]}" stroke="white" stroke-width="2"/>
          <text x="12" y="16" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
            ${labels[type]}
          </text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12)
    };

    const marker = new google.maps.Marker({
      position,
      map,
      icon: markerIcon,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${address}`,
      zIndex: 1000 // Ensure job markers appear above vehicle markers
    });

    return marker;
  };

  // Function to draw job route visualization with pickup/via/drop-off points
  const drawJobRoute = async (vehicle: any, map: google.maps.Map) => {
    // Show route for vehicles with RED status (busy/on job) or YELLOW status (going to pickup)
    if (vehicle.statusColor !== 'red' && vehicle.statusColor !== 'yellow') {
      return;
    }

    try {
      console.log(`🛣️ DRAWING ROUTE for Vehicle ${vehicle.callsign} with ${vehicle.statusColor.toUpperCase()} status (${vehicle.statusColor === 'red' ? 'on job' : 'going to pickup'})`);
      
      // Fetch real current job data from AUTOCAB API
      const currentJobResponse = await fetch(`/api/vehicles/${vehicle.callsign}/current-job`);
      if (!currentJobResponse.ok) {
        console.log(`🛣️ No current job data available for Vehicle ${vehicle.callsign}`);
        return;
      }

      const currentJobData = await currentJobResponse.json();
      if (!currentJobData?.success || !currentJobData?.jobDetails) {
        console.log(`🛣️ No current job data available for Vehicle ${vehicle.callsign}: ${currentJobData?.message || 'No response'}`);
        
        // For demonstration: If vehicle has yellow/red status but no AUTOCAB job data,
        // show that the system is ready to display routes when real job data is available
        if (vehicle.statusColor === 'yellow' || vehicle.statusColor === 'red') {
          console.log(`✅ ROUTE SYSTEM READY: Vehicle ${vehicle.callsign} (${vehicle.statusColor.toUpperCase()}) - Waiting for authentic AUTOCAB job data`);
          console.log(`📍 CURRENT POSITION: Vehicle ${vehicle.callsign} at (${vehicle.coordinates?.lat}, ${vehicle.coordinates?.lng})`);
          console.log(`🎯 SYSTEM STATUS: Route visualization will activate when AUTOCAB provides pickup/destination addresses`);
        }
        return;
      }

      const job = currentJobData.jobDetails;
      
      // Extract real pickup and destination addresses from AUTOCAB job data
      const pickup = job.pickup || job.pickupAddress || job.pickupLocation?.address;
      const destination = job.destination || job.destinationAddress || job.destinationLocation?.address;
      
      if (!pickup || !destination) {
        console.log(`🛣️ Missing pickup (${pickup}) or destination (${destination}) for Vehicle ${vehicle.callsign}`);
        return;
      }

      console.log(`🎯 REAL JOB DATA for Vehicle ${vehicle.callsign}: ${pickup} → ${destination}`);
      
      // Create geocoding service for address conversion
      const geocoder = new google.maps.Geocoder();
      const directionsService = new google.maps.DirectionsService();

      // Geocode pickup and dropoff addresses
      const geocodeAddress = (address: string): Promise<google.maps.LatLng> => {
        return new Promise((resolve, reject) => {
          geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0].geometry.location);
            } else {
              reject(new Error(`Geocoding failed for ${address}: ${status}`));
            }
          });
        });
      };

      try {
        const [pickupLocationResult, dropoffLocationResult] = await Promise.all([
          geocodeAddress(pickup),
          geocodeAddress(destination)
        ]);

        const pickupLocation = pickupLocationResult;
        const dropoffLocation = dropoffLocationResult;

        // Create job markers
        const pickupMarker = createJobMarker(
          { lat: pickupLocation.lat(), lng: pickupLocation.lng() },
          'pickup',
          pickup,
          map
        );
        
        const dropoffMarker = createJobMarker(
          { lat: dropoffLocation.lat(), lng: dropoffLocation.lng() },
          'dropoff', 
          destination,
          map
        );

        jobMarkersRef.current.push(pickupMarker, dropoffMarker);

        // Draw route line from pickup to dropoff
        const routeRequest = {
          origin: pickupLocation,
          destination: dropoffLocation,
          travelMode: google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        };

        directionsService.route(routeRequest, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            
            // Draw route polyline with distinctive styling
            const routeLine = new google.maps.Polyline({
              path: route.overview_path,
              geodesic: true,
              strokeColor: '#ef4444', // Red color to match vehicle status
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: map
            });
            
            polylinesRef.current.push(routeLine);
            
            console.log(`✅ ROUTE DRAWN for Vehicle ${vehicle.callsign}: ${pickup} → ${destination}`);
          } else {
            console.log(`❌ Failed to draw route for Vehicle ${vehicle.callsign}: ${status}`);
          }
        });

      } catch (geocodingError) {
        console.log(`⚠️ Geocoding failed for Vehicle ${vehicle.callsign}, using fallback coordinates`);
        
        // Fallback: Create markers at approximate Canterbury locations
        const fallbackPickup = { lat: 51.2802, lng: 1.0789 }; // Canterbury center
        const fallbackDropoff = { lat: 51.1295, lng: 1.3089 }; // Dover center
        
        const pickupMarker = createJobMarker(
          fallbackPickup,
          'pickup',
          pickup || 'Pickup Location',
          map
        );
        
        const dropoffMarker = createJobMarker(
          fallbackDropoff,
          'dropoff', 
          destination || 'Drop-off Location',
          map
        );

        jobMarkersRef.current.push(pickupMarker, dropoffMarker);
        
        // Draw fallback route line
        const fallbackRoute = new google.maps.Polyline({
          path: [fallbackPickup, fallbackDropoff],
          geodesic: true,
          strokeColor: '#ef4444',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map: map
        });
        
        polylinesRef.current.push(fallbackRoute);
        console.log(`✅ FALLBACK ROUTE for Vehicle ${vehicle.callsign}: Canterbury → Dover`);
      }

      // Vehicle current position
      const vehicleLocation = {
        lat: vehicle.coordinates?.lat || 51.2802,
        lng: vehicle.coordinates?.lng || 1.0789
      };

      // Create waypoints only if pickup and dropoff locations are available
      if (pickupLocation && dropoffLocation && vehicleLocation) {
        const request = {
          origin: pickupLocation,
          destination: dropoffLocation,
          waypoints: [{ 
            location: vehicleLocation, 
            stopover: true 
          }],
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false
        };

        directionsService.route(request, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            const legs = route.legs;
            
            // Draw pickup to vehicle (emphasized - thicker line)
            if (legs[0]) {
              const pickupToVehicle = new google.maps.Polyline({
                path: legs[0].steps.flatMap(step => step.path || []),
                geodesic: true,
                strokeColor: '#20B2AA', // Turquoise color like in the image
                strokeOpacity: 0.9,
                strokeWeight: 6, // Thicker for emphasis
                map: map
              });
              polylinesRef.current.push(pickupToVehicle);
            }

            // Draw vehicle to dropoff (dimmed - thinner line)
            if (legs[1]) {
              const vehicleToDropoff = new google.maps.Polyline({
                path: legs[1].steps.flatMap(step => step.path || []),
                geodesic: true,
                strokeColor: '#20B2AA', // Same turquoise color
                strokeOpacity: 0.5, // More transparent (dimmed)
                strokeWeight: 4, // Thinner line
                map: map
              });
              polylinesRef.current.push(vehicleToDropoff);
            }

            console.log(`✅ ROUTE DRAWN for Vehicle ${vehicle.callsign} - pickup to vehicle (emphasized) + vehicle to dropoff (dimmed)`);
          } else {
            console.log(`❌ Failed to draw route for Vehicle ${vehicle.callsign}:`, status);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error drawing route for Vehicle ${vehicle.callsign}:`, error);
      // Enhanced error debugging for route drawing
      if (error instanceof ReferenceError) {
        console.error(`🚨 REFERENCE ERROR in route drawing: ${error.message}`);
        console.error(`🔍 Available variables:`, {
          vehicleLocation: typeof vehicleLocation !== 'undefined' ? vehicleLocation : 'undefined',
          pickupLocation: typeof pickupLocation !== 'undefined' ? pickupLocation : 'undefined', 
          dropoffLocation: typeof dropoffLocation !== 'undefined' ? dropoffLocation : 'undefined',
          directionsService: typeof directionsService !== 'undefined' ? directionsService : 'undefined'
        });
      }
    }
  };

  // Initialize Google Maps when API is available
  useEffect(() => {
    console.log('🗺️ MAP INIT: Starting initialization check...', {
      hasMapRef: !!mapRef.current,
      isMapReady,
      googleAvailable: typeof google !== 'undefined'
    });

    if (!mapRef.current) {
      console.log('❌ MAP INIT: mapRef.current is null');
      return;
    }

    if (isMapReady) {
      console.log('✅ MAP INIT: Already initialized');
      return;
    }

    const initializeMap = () => {
      try {
        console.log('🗺️ MAP INIT: Creating map instance...');
        console.log('🗺️ MAP INIT: Google available:', typeof google !== 'undefined');
        console.log('🗺️ MAP INIT: Google.maps available:', typeof google?.maps !== 'undefined');
        console.log('🗺️ MAP INIT: Google.maps.Map available:', typeof google?.maps?.Map !== 'undefined');
        console.log('🗺️ MAP INIT: mapRef.current available:', !!mapRef.current);

        if (!mapRef.current) {
          console.error('❌ MAP INIT: mapRef.current is null, cannot create map');
          setError('Map container not available');
          return;
        }

        if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
          console.error('❌ MAP INIT: Google Maps API not properly loaded');
          setError('Google Maps API not loaded');
          return;
        }

        // Create map instance with Map ID for AdvancedMarkerElement support
        // Note: When mapId is present, styles are controlled via Google Cloud Console
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 51.2802, lng: 1.0789 }, // Canterbury, UK
          zoom: 10,
          mapId: "CABCO_VEHICLE_TRACKING_MAP", // Required for AdvancedMarkerElement
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          // styles removed - controlled via Cloud Console when mapId is present
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: false,
          rotateControl: false,
          scaleControl: false,
          panControl: false,
          gestureHandling: 'greedy',
          disableDefaultUI: true
        });

        console.log('🗺️ MAP INIT: Map instance created successfully:', !!map);
        mapInstanceRef.current = map;
        
        // Force immediate state update
        setTimeout(() => {
          console.log('🗺️ MAP INIT: Setting isMapReady to true');
          setIsMapReady(true);
          setError(null);
        }, 100);
        
        console.log('✅ MAP INIT: Map instance created and ready for markers');

        // Add listeners to detect user interaction with map
        map.addListener('dragstart', () => {
          console.log('🎯 USER INTERACTION: Map drag started - preserving position');
          setUserHasInteracted(true);
          setShowResetButton(true);
        });

        map.addListener('zoom_changed', () => {
          if (isFirstLoad || isResetting) return; // Ignore initial zoom setup and reset operations
          console.log('🎯 USER INTERACTION: Zoom changed - preserving position');
          setUserHasInteracted(true);
          setShowResetButton(true);
        });

        map.addListener('center_changed', () => {
          if (isFirstLoad || isResetting) return; // Ignore initial center setup and reset operations
          console.log('🎯 USER INTERACTION: Center changed - preserving position');
          setUserHasInteracted(true);
          setShowResetButton(true);
        });

        // Add click listener to map (not just markers) to detect user interaction
        map.addListener('click', () => {
          if (isResetting) return; // Ignore clicks during reset
          console.log('🎯 USER INTERACTION: Map clicked - preserving position');
          setUserHasInteracted(true);
          setShowResetButton(true);
        });

        // Test scroll wheel event detection
        map.addListener('wheel', () => {
          console.log('🖱️ SCROLL WHEEL EVENT DETECTED on map');
        });

        // Add DOM event listener for testing
        if (mapRef.current) {
          mapRef.current.addEventListener('wheel', (e) => {
            console.log('🖱️ SCROLL WHEEL DOM EVENT DETECTED on map container', e);
          });
        }

        console.log('✅ Google Maps initialized successfully - Map ready for vehicle selection');

      } catch (err) {
        console.error('❌ Google Maps initialization failed:', err);
        setError('Failed to load Google Maps');
      }
    };

    // Enhanced Google Maps API detection with multiple retry strategies
    let retryCount = 0;
    const maxRetries = 20; // 6 seconds total

    const checkAndInit = () => {
      if (typeof google !== 'undefined' && google?.maps?.Map) {
        console.log('🗺️ Google Maps API detected, initializing...');
        initializeMap();
        return;
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`⏳ Waiting for Google Maps API... (${retryCount}/${maxRetries})`);
        setTimeout(checkAndInit, 300);
      } else {
        console.error('❌ Google Maps API failed to load after maximum retries');
        setError('Google Maps failed to load. Please refresh the page.');
      }
    };

    // Load Google Maps script dynamically if not already loaded
    if (!window.google && (config as any)?.GOOGLE_API_KEY) {
      console.log('📥 Loading Google Maps script dynamically...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${(config as any).GOOGLE_API_KEY}&libraries=places,marker&v=weekly&loading=async`;
      script.async = true;
      script.defer = false;
      script.onload = () => {
        console.log('📥 Google Maps script loaded, starting initialization...');
        checkAndInit();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps script');
        setError('Failed to load Google Maps script');
      };
      document.head.appendChild(script);
    } else {
      checkAndInit();
    }
  }, [isMapReady, config]);

  // Update markers when vehicles change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) {
      console.log(`🗺️ Map status: ready=${isMapReady}, map=${!!mapInstanceRef.current}, vehicles=${vehicles.length}`);
      return;
    }

    const updateMarkers = async () => {
      const map = mapInstanceRef.current!;
      const validVehicles = vehicles.filter(v => v.coordinates?.lat && v.coordinates?.lng);

      console.log(`🗺️ MAP UPDATE: Adding ${validVehicles.length} vehicles (UNIQUE only)`);
      
      // COMPLETE CLEANUP: Remove ALL markers from map and clear all references
      markersRef.current.forEach(marker => {
        marker.setMap(null);
        google.maps.event.clearInstanceListeners(marker);
      });
      markersRef.current.clear();

      // Clear existing polylines (route visualizations)
      polylinesRef.current.forEach(polyline => {
        if (polyline && polyline.setMap) {
          polyline.setMap(null);
        }
      });
      polylinesRef.current = [];

      // Clear existing trail lines
      trailLinesRef.current.forEach((trails) => {
        trails.forEach(trail => trail.setMap(null));
      });
      trailLinesRef.current.clear();

      // Clear existing job markers (pickup, via, drop off points)
      if (jobMarkersRef.current) {
        jobMarkersRef.current.forEach(marker => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        jobMarkersRef.current = [];
      }

      // Add markers for vehicles with coordinates
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoordinates = false;

      // DEDUPLICATE vehicles by callsign to prevent multiple markers
      const uniqueVehicles = validVehicles.filter((vehicle, index, arr) => 
        arr.findIndex(v => v.callsign === vehicle.callsign) === index
      );
      
      console.log(`🔍 DEDUPLICATION: ${validVehicles.length} → ${uniqueVehicles.length} unique vehicles`);

      for (const vehicle of uniqueVehicles) {
        if (!vehicle.coordinates) continue;

        const position = {
        lat: vehicle.coordinates.lat,
        lng: vehicle.coordinates.lng
      };

      // Enhanced coordinate debugging
      console.log(`🗺️ MARKER DEBUG ${vehicle.callsign}: INPUT coords=(${vehicle.coordinates.lat}, ${vehicle.coordinates.lng}) → POSITION coords=(${position.lat}, ${position.lng})`);

      // Check if vehicle has moved since last update
      const previousPosition = previousPositionsRef.current.get(vehicle.id);
      let heading = 0; // Default heading
      let isMoving = false;

      if (previousPosition) {
        const latDiff = position.lat - previousPosition.lat;
        const lngDiff = position.lng - previousPosition.lng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        // Simple movement detection (disabled for clean interface)
        if (distance > 0.00001) {
          isMoving = true;
          heading = (Math.atan2(lngDiff, latDiff) * 180 / Math.PI + 360) % 360;
        }
      } else {
        console.log(`📍 VEHICLE ${vehicle.callsign} FIRST POSITION: (${position.lat.toFixed(6)}, ${position.lng.toFixed(6)})`);
      }

      // Use server-computed statusColor for accurate real-time status
      const getMarkerColor = (statusColor: string) => {
        switch (statusColor) {
          case 'red': return '#ef4444'; // Busy - on job, meter on, dispatched
          case 'yellow': return '#eab308'; // Going to client, en route
          case 'gray': return '#6b7280'; // Break, suspended, destination mode
          case 'green':
          default: return '#22c55e'; // Available, free
        }
      };

      const markerColor = getMarkerColor(vehicle.statusColor || 'green');

      // Trail system removed for clean interface

      // Store current position for next comparison
      previousPositionsRef.current.set(vehicle.id, {
        lat: position.lat,
        lng: position.lng,
        timestamp: Date.now()
      });

      // Get color based on AUTOCAB statusColor from backend
      const getVehicleColor = (statusColor: string) => {
        // Convert backend statusColor to hex color
        switch (statusColor?.toLowerCase()) {
          case 'green': return '#22c55e'; // Verde - Available/Clear
          case 'yellow': return '#eab308'; // Galben - En Route/Going to Client
          case 'red': return '#ef4444';   // Rosu - Busy/On Job
          case 'gray': 
          case 'grey': return '#ec4899';  // ROZ - Break/Suspended (changed from gray)
          default: return '#22c55e';      // Default green
        }
      };

      const diverseMarkerColor = getVehicleColor(vehicle.statusColor || 'green');
      
      // Get text color based on background color (black for green markers, white for others)
      const textColor = vehicle.statusColor?.toLowerCase() === 'green' ? 'black' : 'white';

      // Create vehicle marker with rectangular shape and minimal corner rounding
      const markerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
              </filter>
            </defs>
            <rect x="2" y="7" width="30" height="20" rx="3" ry="3" 
                  fill="${diverseMarkerColor}" stroke="white" stroke-width="2" 
                  filter="url(#shadow)"/>
            <text x="17" y="21" text-anchor="middle" 
                  fill="${textColor}" font-family="Arial, sans-serif" font-size="11" font-weight="bold">
              ${vehicle.callsign}
            </text>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(34, 34),
        anchor: new google.maps.Point(17, 17)
      };

      // Create marker element for AdvancedMarkerElement
      const createMarkerElement = (callsign: string, color: string, textColor: string) => {
        const markerElement = document.createElement('div');
        markerElement.style.cssText = `
          width: 30px; height: 20px; border-radius: 3px;
          background: ${color}; border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          color: ${textColor}; font-weight: bold; font-size: 11px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          font-family: Arial, sans-serif;
        `;
        markerElement.textContent = callsign;
        return markerElement;
      };

      // Use modern AdvancedMarkerElement if available, fallback to legacy Marker
      const marker = google.maps.marker?.AdvancedMarkerElement ? 
        new google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          title: `${vehicle.callsign} - ${vehicle.make} ${vehicle.model}${isMoving ? ` (Moving ${heading.toFixed(0)}°)` : ''}`,
          content: createMarkerElement(vehicle.callsign, diverseMarkerColor, textColor)
        }) :
        new google.maps.Marker({
          position,
          map,
          title: `${vehicle.callsign} - ${vehicle.make} ${vehicle.model}${isMoving ? ` (Moving ${heading.toFixed(0)}°)` : ''}`,
          optimized: false,
          icon: markerIcon,
          clickable: true
        });

      // Minimal logging for markers
      if (vehicle.callsign === '997') {
        console.log(`🚗 Marker ${vehicle.callsign} added at (${position.lat}, ${position.lng})`);
      }

      // Add tooltip with driver name and callsign
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <div class="font-bold text-lg">Vehicle ${vehicle.callsign}</div>
            <div class="text-sm text-blue-600 font-medium">${vehicle.driverName || 'Unknown Driver'}</div>
            <div class="text-xs text-gray-600">${vehicle.make} ${vehicle.model}</div>
            <div class="text-xs text-gray-500">${vehicle.registration}</div>
            <div class="text-xs mt-1">
              <span class="inline-block w-2 h-2 rounded-full mr-1" style="background-color: ${markerColor}"></span>
              ${vehicle.status || 'Available'}
            </div>
          </div>
        `
      });

      // Add hover functionality for tooltip
      marker.addListener('mouseover', () => {
        infoWindow.open(map, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      // Enhanced mobile + desktop touch/click detection with improved mobile support
      let touchStartTime = 0;
      let longPressTimer: NodeJS.Timeout | null = null;
      let isLongPress = false;
      let touchMoved = false;

      // Improved mobile touch start handler
      const startInteraction = (event: any) => {
        try {
          console.log(`📱 TOUCH START on Vehicle ${vehicle.callsign} - Starting interaction timer`);
          touchStartTime = Date.now();
          isLongPress = false;
          touchMoved = false;
        
          // Start long press timer (1 second for better mobile experience)
          longPressTimer = setTimeout(() => {
            if (!touchMoved) {
              isLongPress = true;
              console.log(`📱 LONG PRESS DETECTED on Vehicle ${vehicle.callsign} - OPENING STATS PANEL`);
              
              // Add visual feedback for long press
              if (marker.setAnimation) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                  if (marker.setAnimation) {
                    marker.setAnimation(null);
                  }
                }, 700);
              }
              
              // Open vehicle stats panel directly
              if (onVehicleSelect) {
                console.log(`✅ OPENING STATS PANEL for Vehicle ${vehicle.callsign} via long press`);
                onVehicleSelect(vehicle);
              }
            }
          }, 1000); // Reduced to 1 second for better mobile experience
        } catch (error) {
          console.error('Error in touch start listener:', error);
        }
      };

      // Improved touch end handler
      const endInteraction = (event: any) => {
        console.log(`📱 TOUCH END on Vehicle ${vehicle.callsign} - Clearing timer`);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      // Touch move handler to detect if user is dragging
      const moveInteraction = (event: any) => {
        touchMoved = true;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      // Add comprehensive event listeners for all platforms
      try {
        const mouseDownListener = marker.addListener('mousedown', startInteraction);
        const mouseUpListener = marker.addListener('mouseup', endInteraction);
        const mouseMoveListener = marker.addListener('mousemove', moveInteraction);
        
        // Store listeners for cleanup
        markersRef.current.push({
          marker,
          listeners: [mouseDownListener, mouseUpListener, mouseMoveListener]
        });
      } catch (error) {
        console.log('Touch events not supported on this marker type, using click fallback');
      }

      // Mobile double-tap detection for fallback  
      let lastTapTime = 0;
      let tapCount = 0;
      const doubleTapDelay = 400; // 400ms window for double tap

      // Enhanced click handler with improved mobile double-tap detection
      const clickListener = marker.addListener('click', (event: any) => {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime;
        
        console.log(`📱 CLICK EVENT on Vehicle ${vehicle.callsign} - Time since last: ${timeSinceLastTap}ms`);
        
        // Reset tap count if too much time has passed
        if (timeSinceLastTap > doubleTapDelay) {
          tapCount = 0;
        }
        
        tapCount++;
        lastTapTime = currentTime;
        
        // Check for double-tap
        if (tapCount === 2 && timeSinceLastTap < doubleTapDelay) {
          console.log(`📱 DOUBLE-TAP DETECTED on Vehicle ${vehicle.callsign} - OPENING STATS PANEL`);
          
          // Prevent map click and open vehicle stats panel
          if (event && event.stop) {
            event.stop();
          }
          
          // Open vehicle stats panel via double-tap
          if (onVehicleSelect) {
            console.log(`✅ OPENING STATS PANEL for Vehicle ${vehicle.callsign} via double-tap`);
            onVehicleSelect(vehicle);
          }
          
          // Reset tap count
          tapCount = 0;
          return;
        }
        
        // Single click behavior (with delay to allow for potential second tap)
        setTimeout(() => {
          if (tapCount === 1 && !isLongPress) {
            console.log(`🖱️ SINGLE-CLICK on Vehicle ${vehicle.callsign} (${vehicle.driverName}) - TRACKING/FOLLOWING`);
            console.log(`📍 CENTERING MAP on Vehicle ${vehicle.callsign} at (${position.lat}, ${position.lng})`);
            
            // Center map on this vehicle
            map.setCenter(position);
            map.setZoom(16); // Zoom in to follow the vehicle
            
            // Clear any existing routes first
            polylinesRef.current.forEach(polyline => {
              if (polyline && polyline.setMap) {
                polyline.setMap(null);
              }
            });
            polylinesRef.current = [];

            // Clear existing job markers
            if (jobMarkersRef.current) {
              jobMarkersRef.current.forEach(marker => {
                if (marker && marker.setMap) {
                  marker.setMap(null);
                }
              });
              jobMarkersRef.current = [];
            }
            
            // Draw route for this specific vehicle if it has active job
            if (vehicle.statusColor === 'red' || vehicle.statusColor === 'yellow') {
              console.log(`🛣️ DRAWING ROUTE on click for Vehicle ${vehicle.callsign} with ${vehicle.statusColor.toUpperCase()} status`);
              drawJobRoute(vehicle, map);
            }
            
            // Add bounce animation
            if (marker.setAnimation) {
              marker.setAnimation(google.maps.Animation.BOUNCE);
              setTimeout(() => {
                if (marker.setAnimation) {
                  marker.setAnimation(null);
                }
              }, 1400);
            }
            
            console.log(`✅ MAP CENTERED SUCCESSFULLY on Vehicle ${vehicle.callsign}`);
            console.log(`✨ MARKER ANIMATION: Vehicle ${vehicle.callsign} marker bouncing`);
          }
          
          // Reset tap count after delay
          tapCount = 0;
        }, doubleTapDelay + 50);
      });

      // Right-click: Open vehicle stats panel  
      const rightClickListener = marker.addListener('rightclick', () => {
        console.log(`🖱️ RIGHT-CLICK on Vehicle ${vehicle.callsign} (${vehicle.driverName}) - OPENING STATS`);
        
        if (onVehicleSelect) {
          console.log(`✅ EXECUTING onVehicleSelect with vehicle:`, vehicle);
          onVehicleSelect(vehicle);
        } else {
          console.log(`❌ No onVehicleSelect callback provided - showing InfoWindow`);
          infoWindow.open(map, marker);
        }
      });

      // Store marker for cleanup
      markersRef.current.set(vehicle.id, marker);
      bounds.extend(position);
      hasValidCoordinates = true;
      
      // Debug bounds extension
      console.log(`🗺️ BOUNDS EXTENDED for Vehicle ${vehicle.callsign}: position=(${position.lat}, ${position.lng})`);

        // Routes will only be drawn when user clicks on a specific vehicle
        // No automatic route drawing to avoid map clutter
      }

      // Only fit map to show all vehicles on first load or if user hasn't interacted
      if (hasValidCoordinates && !userHasInteracted) {
        console.log('🗺️ AUTO-FITTING map to show all vehicles (user has not interacted)');
        
        // Debug bounds before applying
        const boundsNE = bounds.getNorthEast();
        const boundsSW = bounds.getSouthWest();
        console.log(`🗺️ BOUNDS DEBUG: NE=(${boundsNE.lat()}, ${boundsNE.lng()}) SW=(${boundsSW.lat()}, ${boundsSW.lng()})`);
        console.log(`🗺️ BOUNDS SPAN: lat=${boundsNE.lat() - boundsSW.lat()}, lng=${boundsNE.lng() - boundsSW.lng()}`);
        
        // Calculate appropriate zoom based on bounds span BEFORE applying fitBounds
        const latSpan = boundsNE.lat() - boundsSW.lat();
        const lngSpan = boundsNE.lng() - boundsSW.lng();
        const maxSpan = Math.max(latSpan, lngSpan);
        
        // For wide geographic areas, allow lower zoom levels
        let maxZoom = 12; // Default for wide areas
        if (maxSpan < 0.1) maxZoom = 15;      // Close vehicles
        else if (maxSpan < 0.2) maxZoom = 13;  // Medium spread
        else if (maxSpan < 0.4) maxZoom = 11;  // Wide spread (our case)
        
        console.log(`🗺️ ZOOM CALCULATION: maxSpan=${maxSpan.toFixed(3)}, maxZoom=${maxZoom}`);
        
        map.fitBounds(bounds);
        
        // Apply zoom limit after a short delay to allow fitBounds to complete
        setTimeout(() => {
          const currentZoom = map.getZoom();
          console.log(`🗺️ ZOOM AFTER BOUNDS: ${currentZoom}`);
          
          if (currentZoom! > maxZoom) {
            console.log(`🗺️ ADJUSTING ZOOM: ${currentZoom} → ${maxZoom} (area too zoomed in)`);
            map.setZoom(maxZoom);
          }
        }, 100);
        
        // Mark that first load is complete
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
      } else if (userHasInteracted) {
        console.log('🎯 USER HAS INTERACTED: Preserving current map position and zoom');
      }

      console.log(`🗺️ Updated ${validVehicles.length} vehicle markers on map`);
    };

    updateMarkers();
  }, [vehicles, isMapReady]);

  // Focus on selected vehicle
  useEffect(() => {
    console.log(`🔍 SELECTED VEHICLE CHANGED:`, {
      selectedVehicle: selectedVehicle?.callsign,
      isMapReady,
      hasMapInstance: !!mapInstanceRef.current,
      hasCoordinates: !!selectedVehicle?.coordinates
    });
    
    if (!selectedVehicle) {
      console.log(`❌ No vehicle selected`);
      return;
    }

    if (!isMapReady) {
      console.log(`❌ Map not ready yet`);
      return;
    }

    if (!mapInstanceRef.current) {
      console.log(`❌ Map instance not available`);
      return;
    }

    if (!selectedVehicle.coordinates) {
      console.log(`❌ Vehicle ${selectedVehicle.callsign} has no coordinates`);
      return;
    }

    const map = mapInstanceRef.current;
    const position = {
      lat: selectedVehicle.coordinates.lat,
      lng: selectedVehicle.coordinates.lng
    };

    console.log(`🎯 CENTERING MAP on Vehicle ${selectedVehicle.callsign} at (${position.lat}, ${position.lng})`);
    
    try {
      map.setCenter(position);
      map.setZoom(16);
      
      console.log(`✅ MAP CENTERED SUCCESSFULLY on Vehicle ${selectedVehicle.callsign}`);

      // Highlight selected vehicle marker
      const marker = markersRef.current.get(selectedVehicle.id);
      if (marker) {
        // Only animate if marker supports animation
        if (marker.setAnimation) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => {
            if (marker && marker.setAnimation) {
              marker.setAnimation(null);
            }
          }, 2000);
        }
        
        console.log(`✨ MARKER ANIMATION: Vehicle ${selectedVehicle.callsign} marker bouncing`);
      } else {
        console.log(`⚠️ MARKER NOT FOUND for vehicle ID ${selectedVehicle.id} - available markers:`, Array.from(markersRef.current.keys()));
      }
    } catch (error) {
      console.error(`❌ ERROR centering map:`, error);
    }

  }, [selectedVehicle, isMapReady]);

  // Follow mode: continuously center map on selected vehicle
  useEffect(() => {
    if (!isFollowing || !selectedVehicle || !selectedVehicle.coordinates || !mapInstanceRef.current) {
      return;
    }

    console.log(`🎯 FOLLOW MODE: Tracking vehicle ${selectedVehicle.callsign}`);
    
    const followVehicle = () => {
      if (!isFollowing || !selectedVehicle?.coordinates || !mapInstanceRef.current) return;
      
      const position = {
        lat: selectedVehicle.coordinates.lat,
        lng: selectedVehicle.coordinates.lng
      };
      
      mapInstanceRef.current.panTo(position);
      console.log(`📍 FOLLOW UPDATE: Centered on ${selectedVehicle.callsign} at (${position.lat.toFixed(6)}, ${position.lng.toFixed(6)})`);
    };

    // Follow immediately
    followVehicle();
    
    // Set up interval to follow vehicle position updates
    const followInterval = setInterval(followVehicle, 2000); // Update every 2 seconds
    
    return () => {
      clearInterval(followInterval);
      console.log(`🔄 FOLLOW MODE: Stopped tracking vehicle ${selectedVehicle.callsign}`);
    };
  }, [isFollowing, selectedVehicle, vehicles]); // Also depend on vehicles to get updated coordinates

  // Reset view function to show all vehicles
  const resetView = () => {
    if (!mapInstanceRef.current || vehicles.length === 0) return;
    
    const validVehicles = vehicles.filter(v => v.coordinates?.lat && v.coordinates?.lng);
    if (validVehicles.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    validVehicles.forEach(vehicle => {
      if (vehicle.coordinates) {
        bounds.extend({
          lat: vehicle.coordinates.lat,
          lng: vehicle.coordinates.lng
        });
      }
    });
    
    // Set resetting state to ignore event listeners during reset
    setIsResetting(true);
    console.log('🗺️ RESET VIEW: Starting reset, ignoring user interaction events');
    
    // Apply the bounds
    mapInstanceRef.current.fitBounds(bounds);
    
    // Reset states after animation completes
    setTimeout(() => {
      setUserHasInteracted(false);
      setShowResetButton(false);
      setIsResetting(false);
      console.log('🗺️ RESET VIEW: Reset complete, interaction detection re-enabled');
    }, 1000); // Wait for bounds animation to complete
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Map Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Map Section */}
      <div className="w-full h-full relative">
        <div 
          ref={mapRef} 
          className="w-full h-full cursor-pointer"
        />
        
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-gray-600">Loading Google Maps...</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Helper function to load Google Maps API
function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = false; // Load immediately
    
    script.onload = () => {
      if (window.google) {
        resolve();
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    google: typeof google;
  }
}