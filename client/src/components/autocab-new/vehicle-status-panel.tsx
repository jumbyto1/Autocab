import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Vehicle {
  id: number;
  callsign: string;
  status: string;
  statusColor?: string;
  driverName?: string;
  shiftStats?: {
    cashBookings: number;
    accountBookings: number;
  };
}

interface VehicleStatusPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function VehicleStatusPanel({ isVisible, onToggle }: VehicleStatusPanelProps) {
  const [startY, setStartY] = useState<number>(0);
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Get vehicles data with consistent polling interval to preserve map position
  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 30000, // Aligned with other components for map position preservation
    staleTime: 5000,
  });

  const vehicles: Vehicle[] = vehiclesData?.vehicles || [];

  // Count vehicles by status color
  const statusCounts = vehicles.reduce((acc: any, vehicle: Vehicle) => {
    const color = vehicle.statusColor || 'gray';
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
    console.log(`📱 Touch start: Y=${e.touches[0].clientY}`);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    setDragY(deltaY);
    
    // Prevent scrolling when dragging
    e.preventDefault();
    console.log(`📱 Touch move: deltaY=${deltaY}`);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const SWIPE_THRESHOLD = 50;
    
    // Swipe up to show, swipe down to hide
    if (dragY < -SWIPE_THRESHOLD && !isVisible) {
      onToggle(); // Show panel
      console.log(`📱 Swipe UP detected: Show panel`);
    } else if (dragY > SWIPE_THRESHOLD && isVisible) {
      onToggle(); // Hide panel
      console.log(`📱 Swipe DOWN detected: Hide panel`);
    }
    
    // Reset drag position
    setDragY(0);
  };

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white text-center py-2 cursor-pointer"
        onClick={onToggle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="text-sm font-medium">Vehicle Status</div>
        <div className="text-xs text-gray-300">Swipe up or tap to expand</div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg max-h-[60vh]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div 
        className="bg-gray-800 text-white p-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">Vehicle Status</div>
            <div className="text-xs text-gray-300">Live vehicle tracking</div>
          </div>
          <div className="text-xs text-gray-300">Swipe down to minimize</div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="font-medium text-sm mb-2">Vehicle Status Overview</div>
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium">Available</span>
            </div>
            <div className="text-lg font-bold">{statusCounts.green || 0}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="font-medium">En Route</span>
            </div>
            <div className="text-lg font-bold">{statusCounts.yellow || 0}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="font-medium">In Job</span>
            </div>
            <div className="text-lg font-bold">{statusCounts.red || 3}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <span className="font-medium text-red-800">Offline</span>
            </div>
            <div className="text-lg font-bold text-red-800">{statusCounts.gray || 33}</div>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <ScrollArea className="flex-1 max-h-[40vh]">
        <div className="p-4">
          <div className="text-sm text-gray-600 mb-3">
            Click on a vehicle to view details and statistics
          </div>
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div 
                key={vehicle.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    vehicle.statusColor === 'red' ? 'bg-red-500' :
                    vehicle.statusColor === 'yellow' ? 'bg-yellow-500' :
                    vehicle.statusColor === 'gray' ? 'bg-gray-500' :
                    'bg-green-500'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">Vehicle {vehicle.callsign}</div>
                    <div className="text-xs text-gray-600">{vehicle.driverName || 'Unknown Driver'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {vehicle.status}
                  </Badge>
                  {vehicle.shiftStats && (
                    <div className="text-xs text-gray-500 mt-1">
                      {vehicle.shiftStats.cashBookings + vehicle.shiftStats.accountBookings} jobs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}