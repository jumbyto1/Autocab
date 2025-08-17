import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Car, MapPin, X, Menu, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { GoogleMapsPanel } from './google-maps-panel';
import { VehicleListPanel } from './vehicle-list-panel';
import { VehicleStatsPanelMobile } from './vehicle-stats-panel-mobile';
import type { Vehicle, VehiclesApiResponse } from '@/lib/types';

interface AutocabInterfaceMobileProps {
  isMobile: boolean;
}

export function AutocabInterfaceMobile({ isMobile }: AutocabInterfaceMobileProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statsVehicle, setStatsVehicle] = useState<Vehicle | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [showVehicleStats, setShowVehicleStats] = useState(false);
  const [vehicleAddress, setVehicleAddress] = useState<string>('Loading location...');
  const [, setLocation] = useLocation();

  // Function to get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat, lng };
        
        return new Promise((resolve) => {
          geocoder.geocode({ location: latlng }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              // Extract just the street name and area, not full address
              const addressComponents = results[0].address_components;
              const streetNumber = addressComponents.find((comp: any) => comp.types.includes('street_number'))?.long_name || '';
              const streetName = addressComponents.find((comp: any) => comp.types.includes('route'))?.long_name || '';
              const area = addressComponents.find((comp: any) => comp.types.includes('locality'))?.long_name || 
                          addressComponents.find((comp: any) => comp.types.includes('sublocality'))?.long_name || '';
              
              if (streetName && area) {
                resolve(`${streetNumber} ${streetName}, ${area}`.trim());
              } else if (streetName) {
                resolve(streetName);
              } else if (area) {
                resolve(area);
              } else {
                resolve(results[0].formatted_address.split(',')[0]); // First part of address
              }
            } else {
              resolve('Location not found');
            }
          });
        });
      } else {
        return 'Maps not available';
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Address lookup failed';
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle | null) => {
    setSelectedVehicle(vehicle);
    if (vehicle) {
      console.log(`🚗 Vehicle ${vehicle.callsign} selected on mobile`);
      setShowVehicleList(false);
      
      // Get address for the vehicle
      if (vehicle.coordinates) {
        setVehicleAddress('Loading location...');
        getAddressFromCoordinates(vehicle.coordinates.lat, vehicle.coordinates.lng)
          .then(address => setVehicleAddress(address));
      }
    }
  };

  // New function to directly open vehicle stats panel (same as clicking "View More" button)
  const handleVehicleClickOnMap = (vehicle: Vehicle) => {
    console.log(`🗺️ MAP CLICK: Opening vehicle stats for ${vehicle.callsign}`);
    setStatsVehicle(vehicle);
    setShowVehicleStats(true);
    setSelectedVehicle(null); // Close the basic vehicle selection modal
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    console.log(`🎯 Follow mode ${!isFollowing ? 'activated' : 'deactivated'} for vehicle ${selectedVehicle?.callsign}`);
  };

  // Get vehicles data with balanced polling for real-time updates while preserving map position
  const { data: vehiclesData, isLoading, error } = useQuery<VehiclesApiResponse>({
    queryKey: ['/api/vehicles'],
    refetchInterval: 30000, // Refresh every 30 seconds to preserve user map interaction
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 3
  });

  const vehicles: Vehicle[] = vehiclesData?.vehicles || [];

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Vehicle Data Error
          </div>
          <div className="text-gray-600">
            Failed to load vehicle data from AUTOCAB API
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Please check API connection and try again
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    // Mobile full screen layout with simple overlays
    return (
      <div className="autocab-mobile-container h-screen w-screen bg-gray-100 relative m-0 p-0 overflow-hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Full screen map */}
        <GoogleMapsPanel 
          vehicles={vehicles} 
          selectedVehicle={selectedVehicle}
          onVehicleSelect={handleVehicleClickOnMap}
          isFollowing={isFollowing}
        />

        {/* Navigation buttons - top left */}
        <div className="absolute top-3 left-3 z-50 flex gap-2">
          {/* Back to Main Menu */}
          <Button 
            onClick={() => setLocation('/')}
            variant="default" 
            size="sm" 
            className="bg-gray-600 hover:bg-gray-700 text-white shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Vehicle List Menu - separate component */}
        <Sheet open={showVehicleList} onOpenChange={setShowVehicleList}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="sm" 
              className="absolute top-3 left-14 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 pb-0">
              <SheetTitle>Vehicle List</SheetTitle>
            </SheetHeader>
            <VehicleListPanel 
              vehicles={vehicles} 
              selectedVehicle={selectedVehicle} 
              onVehicleSelect={handleVehicleSelect}
              isMobile={true}
            />
          </SheetContent>
        </Sheet>

        {/* Simple vehicle count overlay - top right */}
        <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg z-40">
          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Car className="w-4 h-4" />
            {vehicles.length} vehicles
          </div>
        </div>





        {/* Vehicle details - completely new simple implementation */}
        {selectedVehicle && !showVehicleList && (
          <div 
            className="fixed inset-0 z-50 bg-black bg-opacity-50"
            onClick={() => setSelectedVehicle(null)}
          >
            <div 
              className="fixed bg-white"
              onClick={(e) => e.stopPropagation()}
              style={{ 
                left: '5%',
                right: '5%',
                top: '20vh',  // Puțin mai sus
                maxHeight: '70vh',  // Mult mai înalt pentru mai mult conținut
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '500' }}>
                  <div 
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: selectedVehicle.statusColor === 'red' ? '#ef4444' :
                                     selectedVehicle.statusColor === 'yellow' ? '#eab308' :
                                     selectedVehicle.statusColor === 'gray' ? '#6b7280' : '#22c55e'
                    }}
                  />
                  Vehicle {selectedVehicle.callsign}
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
                    Tap outside to close
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(60vh - 70px)' }}>
                {/* Vehicle Info */}
                <div style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ padding: '12px', borderBottom: '1px solid #bfdbfe', fontWeight: '500', fontSize: '14px', color: '#1e40af' }}>
                    Driver & Vehicle
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Driver:</div>
                      <div style={{ fontWeight: '500', color: '#1e40af', fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {selectedVehicle.driverName || 'Unknown'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Status:</div>
                      <div style={{ fontWeight: '500', color: '#1e40af', fontSize: '12px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {selectedVehicle.status}
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Vehicle:</div>
                      <div style={{ fontWeight: '500', color: '#1e40af', fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {selectedVehicle.make || 'Unknown'} {selectedVehicle.model || ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Registration:</div>
                      <div style={{ fontWeight: '500', color: '#1e40af', fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {selectedVehicle.registration || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                {selectedVehicle.shiftStats && (
                  <div style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid #bbf7d0', fontWeight: '500', fontSize: '12px', color: '#166534' }}>
                      Today's Earnings
                    </div>
                    <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#15803d' }}>
                          {selectedVehicle.shiftStats?.cashBookings || 0}
                        </div>
                        <div style={{ color: '#16a34a', fontSize: '12px' }}>Cash Jobs</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1d4ed8' }}>
                          {selectedVehicle.shiftStats?.accountBookings || 0}
                        </div>
                        <div style={{ color: '#2563eb', fontSize: '12px' }}>Account Jobs</div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Location */}
                {selectedVehicle.coordinates && (
                  <div style={{ backgroundColor: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#7c3aed', marginBottom: '4px' }}>
                      Current Location
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      {vehicleAddress}
                    </div>
                  </div>
                )}

                {/* VIEW MORE Button */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <button
                    onClick={() => {
                      console.log(`📊 VIEW MORE button clicked for vehicle ${selectedVehicle.callsign}`);
                      console.log(`🔧 Setting showVehicleStats to true and saving vehicle for stats`);
                      // Save the vehicle for stats panel
                      setStatsVehicle(selectedVehicle);
                      // Close the vehicle details popup
                      setSelectedVehicle(null);
                      // Show the stats panel
                      setShowVehicleStats(true);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                      <path d="M9 11V9a3 3 0 1 1 6 0v2"/>
                      <rect x="9" y="11" width="6" height="7"/>
                    </svg>
                    VIEW MORE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Stats Panel - triggered by VIEW MORE button - MOBILE VERSION */}
        <Sheet open={showVehicleStats} onOpenChange={setShowVehicleStats}>
          <SheetContent side="bottom" className="w-full h-[90vh] p-0 rounded-t-xl">
            <SheetHeader className="p-4 border-b bg-gray-50">
              <SheetTitle className="text-lg font-medium text-center">
                Vehicle Statistics & Job Details
              </SheetTitle>
            </SheetHeader>
            {statsVehicle && (
              <VehicleStatsPanelMobile
                vehicle={statsVehicle}
                onClose={() => {
                  console.log('🔄 MOBILE: Closing VehicleStatsPanelMobile');
                  setShowVehicleStats(false);
                  setStatsVehicle(null);
                }}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // For desktop screens, show mobile layout too - no separate desktop layout
  return (
    <div className="h-screen bg-gray-100 relative">
      {/* Full screen map */}
      <GoogleMapsPanel 
        vehicles={vehicles} 
        selectedVehicle={selectedVehicle}
        onVehicleSelect={handleVehicleSelect}
        isFollowing={isFollowing}
      />

      {/* Simple vehicle count overlay - top right */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg z-40">
        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Car className="w-4 h-4" />
          {vehicles.length} vehicles
        </div>
      </div>

      {/* Vehicle details sheet - triggered by tap */}
      <Sheet open={showVehicleList} onOpenChange={setShowVehicleList}>
        <SheetTrigger asChild>
          <div className="absolute bottom-4 left-4 z-40">
            <Button 
              size="sm" 
              variant="default"
              className="h-10 px-4 text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
            >
              <Car className="w-4 h-4 mr-2" />
              Vehicle List
            </Button>
          </div>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-3 border-b bg-gray-50">
            <SheetTitle className="text-sm font-medium">Vehicle List ({vehicles.length})</SheetTitle>
          </SheetHeader>
          <VehicleListPanel 
            onVehicleSelect={handleVehicleSelect}
            selectedVehicle={selectedVehicle}
          />
        </SheetContent>
      </Sheet>

      {/* Vehicle Stats Panel - triggered by VIEW MORE button */}
      <Sheet open={showVehicleStats} onOpenChange={setShowVehicleStats}>
        <SheetContent side="right" className="w-full sm:w-80 p-0">
          <SheetHeader className="p-3 border-b bg-gray-50">
            <SheetTitle className="text-sm font-medium">
              Vehicle Statistics
            </SheetTitle>
          </SheetHeader>
          {statsVehicle && (
            <VehicleStatsPanelMobile
              vehicle={statsVehicle}
              onClose={() => {
                setShowVehicleStats(false);
                setStatsVehicle(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}