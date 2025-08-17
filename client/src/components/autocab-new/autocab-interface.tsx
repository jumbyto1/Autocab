import { useState, useEffect } from 'react';
import { VehicleListPanel } from './vehicle-list-panel';
import { GoogleMapsPanel } from './google-maps-panel';
import { VehicleStatsPanel } from './vehicle-stats-panel';
import { AutocabLiveBookingsV2 } from '../autocab-live-bookings-v2';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Menu, Car, MapPin, X, ChevronUp, ChevronDown, Minimize2, Maximize2, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Vehicle } from '@/lib/types';

export function AutocabInterface() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statsVehicle, setStatsVehicle] = useState<Vehicle | null>(null);
  const [showVehicleList, setShowVehicleList] = useState(true);
  const [showVehicleStats, setShowVehicleStats] = useState(false);
  const [isBookingQueueCollapsed, setIsBookingQueueCollapsed] = useState(false);
  const [, setLocation] = useLocation();
  // Remove all mobile detection - this component is ONLY used on desktop
  // The AutocabInterfacePage handles mobile/desktop routing

  // ESC key handler to close vehicle stats panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showVehicleStats && statsVehicle) {
          console.log(`⌨️ ESC pressed - closing vehicle stats panel for: ${statsVehicle.callsign}`);
          setShowVehicleStats(false);
          setStatsVehicle(null);
        } else if (selectedVehicle) {
          console.log(`⌨️ ESC pressed - closing vehicle selection for: ${selectedVehicle.callsign}`);
          setSelectedVehicle(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVehicle, showVehicleStats, statsVehicle]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    console.log(`🎯 DESKTOP AUTOCAB INTERFACE: Vehicle selected - ${vehicle.callsign} (${vehicle.driverName})`);
    console.log(`📍 VEHICLE COORDINATES FOR MAP:`, vehicle.coordinates);
    console.log(`📊 SHIFT STATS:`, vehicle.shiftStats);
    console.log(`🔍 Full vehicle object:`, vehicle);
    // This is the desktop-only component
    setSelectedVehicle(vehicle);
    // Don't close the vehicle panel on desktop after selection - keep it open
    console.log(`✅ DESKTOP selectedVehicle state set to:`, vehicle.callsign);
    console.log(`🔍 DESKTOP selectedVehicle after setState:`, selectedVehicle?.callsign || 'still null');
  }

  const handleViewStats = (vehicle: Vehicle) => {
    console.log(`📊 DESKTOP VIEW STATS: Opening stats panel for vehicle ${vehicle.callsign}`);
    setStatsVehicle(vehicle);
    setShowVehicleStats(true);
  };

  // DEBUG: Log when the function is created
  console.log(`🔧 DESKTOP handleVehicleSelect function created:`, typeof handleVehicleSelect);;

  // Get vehicles data with balanced polling for real-time updates while preserving map position
  const { data: vehiclesData, isLoading, error } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 30000, // Refresh every 30 seconds to preserve user map interaction
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 3
  });

  const vehicles: Vehicle[] = (vehiclesData as any)?.vehicles || [];
  
  console.log(`🔍 DESKTOP AUTOCAB INTERFACE: vehicles.length = ${vehicles.length}`);

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

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back to Main Menu Arrow */}
            <Button
              onClick={() => setLocation('/')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden md:inline">Main Menu</span>
            </Button>
            <div className="border-l border-gray-300 h-6" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Vehicle Tracking</h1>
              <p className="text-sm text-gray-600">
                Real-time vehicle monitoring and dispatch system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {vehicles.length} Vehicles Online
              </div>
              <div className="text-xs text-gray-500">
                {isLoading ? 'Updating...' : 'Live Data'}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {(selectedVehicle || (showVehicleStats && statsVehicle)) ? (
          // When stats panel is needed - use flexbox layout  
          <div className="flex flex-1 h-full">
            {/* Vehicle List Panel - Fixed width */}
            {showVehicleList && (
              <div className="w-64 h-full bg-white border-r border-gray-200">
                <VehicleListPanel 
                  onVehicleSelect={handleVehicleSelect}
                  selectedVehicle={selectedVehicle}
                  onViewStats={handleViewStats}
                />
              </div>
            )}

            {/* Map Panel - Takes remaining space */}
            <div className="relative flex-1 h-full">
              {/* Vehicle List Toggle Button */}
              <Button
                onClick={() => setShowVehicleList(!showVehicleList)}
                className="absolute top-4 left-4 z-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm"
                size="sm"
              >
                <Menu className="h-4 w-4 mr-2" />
                Vehicle List
              </Button>

              <GoogleMapsPanel 
                selectedVehicle={selectedVehicle}
                vehicles={vehicles}
                onVehicleSelect={handleVehicleSelect}
              />
            </div>
            
            {/* Vehicle Stats Panel - ALIGNED RIGHT (în dreapta de tot) - WIDER +3cm */}
            <div className="w-96 h-full border-l border-gray-200 bg-white ml-auto">
              <VehicleStatsPanel 
                vehicle={selectedVehicle || statsVehicle!}
                onClose={() => {
                  const vehicleToClose = selectedVehicle || statsVehicle;
                  console.log(`❌ CLOSING STATS PANEL for vehicle: ${vehicleToClose?.callsign}`);
                  if (selectedVehicle) {
                    setSelectedVehicle(null);
                  }
                  if (showVehicleStats && statsVehicle) {
                    setShowVehicleStats(false);
                    setStatsVehicle(null);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          // When no stats panel needed - simple two-panel layout
          showVehicleList ? (
            <div className="flex flex-1 h-full">
              {/* Vehicle List Panel - Fixed width, no resizing */}
              <div className="h-full bg-white border-r border-gray-200">
                <VehicleListPanel 
                  onVehicleSelect={handleVehicleSelect}
                  selectedVehicle={selectedVehicle}
                  onViewStats={handleViewStats}
                />
              </div>
              
              {/* Map and Bookings Panel - Full remaining width */}
              <div className="relative flex-1 h-full flex flex-col">
                {/* Vehicle List Toggle Button */}
                <Button
                  onClick={() => setShowVehicleList(!showVehicleList)}
                  className="absolute top-4 left-4 z-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm"
                  size="sm"
                >
                  <Menu className="h-4 w-4 mr-2" />
                  Vehicle List
                </Button>

                {/* Map Panel - Takes 70% of height */}
                <div className="flex-1" style={{ minHeight: '60%' }}>
                  <GoogleMapsPanel 
                    selectedVehicle={selectedVehicle}
                    vehicles={vehicles}
                    onVehicleSelect={handleVehicleSelect}
                  />
                </div>

                {/* Live Bookings Table - Resizable */}
                <div className={`border-t border-gray-200 bg-white transition-all duration-300 ${
                  isBookingQueueCollapsed ? 'h-10' : 'h-64 resize-y overflow-hidden'
                }`}>
                  <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Unassigned Bookings</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setIsBookingQueueCollapsed(!isBookingQueueCollapsed)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                      >
                        {isBookingQueueCollapsed ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {!isBookingQueueCollapsed && (
                    <AutocabLiveBookingsV2 height="h-full" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Map only - no vehicle list
            <div className="relative flex-1 h-full flex flex-col">
              {/* Vehicle List Toggle Button */}
              <Button
                onClick={() => setShowVehicleList(!showVehicleList)}
                className="absolute top-4 left-4 z-10 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 shadow-sm"
                size="sm"
              >
                <Menu className="h-4 w-4 mr-2" />
                Vehicle List
              </Button>

              {/* Map Panel - Takes 70% of height */}
              <div className="flex-1" style={{ minHeight: '60%' }}>
                <GoogleMapsPanel 
                  selectedVehicle={selectedVehicle}
                  vehicles={vehicles}
                  onVehicleSelect={handleVehicleSelect}
                />
              </div>

              {/* Live Bookings Table - Resizable */}
              <div className={`border-t border-gray-200 bg-white transition-all duration-300 ${
                isBookingQueueCollapsed ? 'h-10' : 'h-64 resize-y overflow-hidden'
              }`}>
                <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Unassigned Bookings</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsBookingQueueCollapsed(!isBookingQueueCollapsed)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      {isBookingQueueCollapsed ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {!isBookingQueueCollapsed && (
                  <AutocabLiveBookingsV2 height="h-full" />
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Status Bar with Vehicle List Toggle */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <span className="text-gray-600">
              Total Vehicles: <span className="font-medium">{vehicles.length}</span>
            </span>
            <span className="text-gray-600">
              Active: <span className="font-medium text-green-600">
                {vehicles.filter(v => v.isActive && !v.isSuspended).length}
              </span>
            </span>
            <span className="text-gray-600">
              Busy: <span className="font-medium text-red-600">
                {vehicles.filter(v => 
                  v.status?.toLowerCase().includes('busy') || 
                  v.status?.toLowerCase().includes('job')
                ).length}
              </span>
            </span>
            <span className="text-gray-600">
              With GPS: <span className="font-medium text-blue-600">
                {vehicles.filter(v => v.coordinates).length}
              </span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Last Updated:</span>
            <span className="text-gray-600 font-mono text-xs">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}