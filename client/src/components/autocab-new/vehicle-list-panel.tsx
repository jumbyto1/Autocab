import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";


import { Vehicle, VehicleListPanelProps, VehiclesApiResponse } from "@/lib/types";

export function VehicleListPanel({ onVehicleSelect, selectedVehicle, onViewStats }: VehicleListPanelProps) {
  const { data: vehiclesData, isLoading } = useQuery<VehiclesApiResponse>({
    queryKey: ['/api/vehicles'],
    refetchInterval: 30000 // Refresh every 30 seconds to allow user map interaction
  });

  const vehicles: Vehicle[] = vehiclesData?.vehicles || [];
  
  // Sort vehicles by job status: in job first (RED), then available (GREEN/YELLOW), then offline (GRAY)
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const getStatusPriority = (vehicle: Vehicle) => {
      const status = vehicle.statusColor?.toLowerCase();
      if (status === 'red') return 0; // In job - highest priority
      if (status === 'yellow') return 1; // En route - medium priority
      if (status === 'green') return 2; // Available - normal priority
      if (status === 'gray') return 3; // Break/offline - lowest priority
      return 4; // Unknown status - lowest priority
    };
    
    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same status, sort by vehicle callsign number
    const callsignA = parseInt(a.callsign) || 0;
    const callsignB = parseInt(b.callsign) || 0;
    return callsignA - callsignB;
  });

  const getStatusColor = (vehicle: Vehicle) => {
    // Use authentic statusColor from backend instead of synthetic calculation
    if (vehicle.statusColor) {
      switch (vehicle.statusColor.toUpperCase()) {
        case 'RED': return 'bg-red-500';
        case 'YELLOW': return 'bg-yellow-500'; 
        case 'GREEN': return 'bg-green-500';
        case 'GRAY':
        case 'GREY': return 'bg-pink-500'; // ROZ instead of gray
        default: return 'bg-blue-500';
      }
    }
    
    // Fallback for vehicles without statusColor
    return 'bg-pink-400'; // ROZ instead of gray for fallback
  };

  const getStatusTextColor = (vehicle: Vehicle) => {
    // Return text color for ROZ/GRAY status vehicles
    if (vehicle.statusColor && (vehicle.statusColor.toUpperCase() === 'GRAY' || vehicle.statusColor.toUpperCase() === 'GREY')) {
      return 'text-red-800'; // Dark red text for ROZ background
    }
    return 'text-gray-600'; // Normal gray text for other colors
  };



  const getZoneColor = (zone?: string) => {
    switch (zone?.toUpperCase()) {
      case 'DISP': return 'bg-blue-100 text-blue-800';
      case 'BUSY': return 'bg-red-100 text-red-800';
      case 'CANT': return 'bg-green-100 text-green-800';
      case 'OUTE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <h2 className="font-bold text-lg mb-4">Loading Vehicles...</h2>
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Vehicle List Header - Compact */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 flex-shrink-0">
        <h3 className="text-xs font-semibold text-gray-900">
          Vehicles ({vehicles.length})
        </h3>
      </div>

      {/* Scrollable Vehicle List - All vehicles visible with scroll */}
      <div className="flex-1 overflow-y-auto vehicle-scroll" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <div className="space-y-0">
          {sortedVehicles.map((vehicle: Vehicle) => (
            <div
              key={vehicle.id}
              onClick={() => {
                console.log(`🖱️ LEFT-CLICK on Vehicle ${vehicle.callsign} (${vehicle.driverName}) - ID: ${vehicle.id}`);
                console.log(`📍 VEHICLE COORDINATES:`, vehicle.coordinates);
                console.log(`🔄 CALLING onVehicleSelect with vehicle:`, vehicle);
                onVehicleSelect?.(vehicle);
              }}
              onContextMenu={(e) => {
                e.preventDefault(); // Prevent default browser context menu
                console.log(`🖱️ RIGHT-CLICK on Vehicle ${vehicle.callsign} (${vehicle.driverName}) - ID: ${vehicle.id}`);
                console.log(`📍 VEHICLE COORDINATES:`, vehicle.coordinates);
                console.log(`🔄 CALLING onVehicleSelect with vehicle:`, vehicle);
                onVehicleSelect?.(vehicle);
              }}
              className={`px-3 py-3 mb-2 cursor-pointer transition-colors border-b border-gray-100 ${
                selectedVehicle?.id === vehicle.id 
                  ? 'bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* Improved spacing layout */}
              <div className="flex items-center justify-between h-6 text-sm">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(vehicle)}`} />
                  <span className={`font-bold flex-shrink-0 text-xs ${vehicle.statusColor && (vehicle.statusColor.toUpperCase() === 'GRAY' || vehicle.statusColor.toUpperCase() === 'GREY') ? 'text-red-800' : 'text-gray-900'}`}>{vehicle.callsign}</span>
                  <span className={`truncate min-w-0 text-xs ${getStatusTextColor(vehicle)}`}>
                    {vehicle.driverName || 'Unknown'}
                  </span>
                </div>
                

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}