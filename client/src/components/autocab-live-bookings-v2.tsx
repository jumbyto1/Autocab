import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface AutocabBooking {
  id?: number;
  bookingId: number;
  pickup: string;
  destination: string;
  customerName: string;
  price: number;
  status: string;
  pickupTime: string;
  zone?: string;
  requestedVehicles?: string[];
  requestedDrivers?: string[];
}

interface Assignment {
  driverId: string;
  driverName: string;
  vehicleCallsign: string;
  bookings: AutocabBooking[];
  totalJobs: number;
  authenticBookings: number;
  assignmentType: string;
  isVirtual: boolean;
}

interface DriverAssignmentsResponse {
  success: boolean;
  assignments: Assignment[];
  totalDrivers: number;
  driversWithJobs: number;
  totalActiveBookings: number;
}

interface AutocabLiveBookingsV2Props {
  height?: string;
  className?: string;
}

export function AutocabLiveBookingsV2({ height = "h-64", className = "" }: AutocabLiveBookingsV2Props) {
  // Search filters state
  const [searchFilters, setSearchFilters] = useState({
    driverId: '',
    vehicleId: '',
    telephoneNumber: '',
    customerName: '',
    searchType: 'all' // all, driver, vehicle, phone, customer
  });
  
  // Build query parameters
  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (searchFilters.driverId) params.append('driverId', searchFilters.driverId);
    if (searchFilters.vehicleId) params.append('vehicleId', searchFilters.vehicleId);
    if (searchFilters.telephoneNumber) params.append('telephoneNumber', searchFilters.telephoneNumber);
    if (searchFilters.customerName) params.append('customerName', searchFilters.customerName);
    return params.toString();
  };

  // Test new AUTOCAB direct endpoint first
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/autocab/unassigned-bookings', searchFilters],
    queryFn: async () => {
      const response = await fetch('/api/autocab/unassigned-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: searchFilters.driverId || undefined,
          vehicleId: searchFilters.vehicleId || undefined,
          telephoneNumber: searchFilters.telephoneNumber || undefined,
          customerName: searchFilters.customerName || undefined
        })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    refetchInterval: searchFilters.driverId || searchFilters.vehicleId || searchFilters.telephoneNumber || searchFilters.customerName ? 0 : 5000, // Disable auto-refresh when searching
    refetchOnWindowFocus: true,
  });

  console.log('🎯 UNASSIGNED BOOKINGS DATA:', data);
  console.log('🔍 LOADING STATE:', isLoading);
  console.log('❌ ERROR STATE:', error);
  console.log('📊 UNASSIGNED BOOKINGS LENGTH:', data?.unassignedBookings?.length);
  console.log('📝 FIRST BOOKING SAMPLE:', data?.unassignedBookings?.[0]);

  // Fallback to driver assignments if new endpoint not available
  const fallbackQuery = useQuery({
    queryKey: ['/api/drivers-assignments'],
    refetchInterval: 5000,
    enabled: !data && !isLoading, // Only run if main query isn't working
  }) as { data: DriverAssignmentsResponse | undefined; isLoading: boolean; error: any };

  const assignments = fallbackQuery.data?.assignments || [];
  const totalBookings = fallbackQuery.data?.totalActiveBookings || 0;
  
  // Use new endpoint data if available, fallback to old assignments
  const unassignedBookings: AutocabBooking[] = data?.unassignedBookings || assignments
    .filter(assignment => assignment.assignmentType === 'unassigned' || assignment.isVirtual)
    .flatMap(assignment => assignment.bookings);
    
  const assignedBookings = data?.assignedBookings || [];
  const totalAssigned = data?.totalAssigned || 0;
  const totalUnassigned = data?.totalUnassigned || unassignedBookings.length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-500 text-white';
      case 'advanced': return 'bg-blue-500 text-white';
      case 'mobile': return 'bg-yellow-500 text-white';
      case 'dispatched': return 'bg-orange-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'HH:mm');
    } catch {
      return timeString.substring(0, 5); // fallback to first 5 chars
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchFilters({
      driverId: '',
      vehicleId: '',
      telephoneNumber: '',
      customerName: '',
      searchType: 'all'
    });
  };

  // Manual search trigger
  const handleSearch = () => {
    refetch();
  };

  // Check if any filters are active
  const hasActiveFilters = searchFilters.driverId || searchFilters.vehicleId || searchFilters.telephoneNumber || searchFilters.customerName;

  return (
    <div className={`${height} bg-white ${className}`}>
      {/* Search Controls */}
      <div className="px-2 py-2 border-b bg-gray-50">
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div>
            <Label htmlFor="driverId" className="text-xs">Driver ID</Label>
            <Input
              id="driverId"
              placeholder="e.g. 182, 997"
              value={searchFilters.driverId}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, driverId: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="vehicleId" className="text-xs">Vehicle ID</Label>
            <Input
              id="vehicleId"
              placeholder="e.g. 182, 997"
              value={searchFilters.vehicleId}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, vehicleId: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="telephoneNumber" className="text-xs">Phone</Label>
            <Input
              id="telephoneNumber"
              placeholder="07..."
              value={searchFilters.telephoneNumber}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, telephoneNumber: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="customerName" className="text-xs">Customer</Label>
            <Input
              id="customerName"
              placeholder="Name..."
              value={searchFilters.customerName}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, customerName: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button 
              onClick={handleSearch} 
              size="sm" 
              className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Search className="h-3 w-3 mr-1" />
              Search
            </Button>
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters} 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {hasActiveFilters ? 'Manual Search' : 'Auto-refresh: 5s'}
          </div>
        </div>
      </div>

      {/* Bookings Status Header */}
      <div className="px-2 py-1 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            Live AUTOCAB Jobs
          </span>
          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
            {totalUnassigned} Unassigned
          </Badge>
          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
            {totalAssigned} Assigned
          </Badge>
          {isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
          )}
        </div>
      </div>

      <div className="h-[calc(100%-32px)] overflow-y-auto resize-y">
        {error ? (
          <div className="p-2 text-center text-red-500 text-xs">
            Error loading bookings: {error.message}
          </div>
        ) : unassignedBookings.length === 0 ? (
          <div className="p-2 text-center text-gray-500 text-xs">
            {isLoading ? 'Loading bookings...' : 'No active bookings'}
          </div>
        ) : (
          <div className="text-xs">


            {/* Table Header - Layout simplu ca în prima imagine */}
            <div className="grid grid-cols-6 gap-2 px-2 py-1 bg-gray-100 border-b text-xs font-medium text-gray-700 sticky top-0">
              <div>Time</div>
              <div>Name</div>
              <div>Zone</div>
              <div>Cost</div>
              <div>Req Vehicles</div>
              <div>Booking ID</div>
            </div>
            
            {/* UNASSIGNED Bookings Rows */}
            {unassignedBookings.map((booking, index) => (
              <div 
                key={booking.bookingId || booking.id} 
                className={`grid grid-cols-6 gap-2 px-2 py-1 border-b hover:bg-gray-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                <div className="text-xs text-gray-600">
                  {formatTime(booking.pickupTime)}
                </div>
                <div className="text-xs font-medium text-gray-900">
                  {truncateText(booking.customerName, 15)}
                </div>
                <div className="text-xs text-gray-600">
                  {booking.zone || 'STAN'}
                </div>
                <div className="text-xs font-medium text-green-600">
                  £{booking.price.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600">
                  {/* CONSTRAINT RESOLUTION: Show resolved callsign - NEVER show constraint IDs */}
                  {(booking as any).resolvedVehicleCallsign ? 
                    `Vehicle ${(booking as any).resolvedVehicleCallsign}` : 
                    (booking.requestedVehicles?.length > 0 ? 'Vehicle TBA' : '')
                  }
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {booking.bookingId}
                </div>
              </div>
            ))}
            
            {/* ASSIGNED Bookings Separator */}
            {assignedBookings.length > 0 && (
              <div className="grid grid-cols-14 gap-1 px-2 py-1 bg-green-50 border-b">
                <div className="col-span-14 text-xs font-medium text-green-800 flex items-center gap-2">
                  <span>📍 Assigned Bookings ({assignedBookings.length})</span>
                </div>
              </div>
            )}
            
            {/* ASSIGNED Bookings Rows */}
            {assignedBookings.map((booking: any, index: number) => (
              <div 
                key={`assigned-${booking.bookingId}`} 
                className={`grid grid-cols-14 gap-1 px-2 py-1 border-b hover:bg-green-50 ${
                  index % 2 === 0 ? 'bg-green-25' : 'bg-green-50'
                }`}
              >
                <div className="col-span-1 text-xs text-gray-600">
                  {formatTime(booking.pickupTime)}
                </div>
                <div className="col-span-1 text-xs font-medium text-gray-900">
                  {truncateText(booking.customerName, 12)}
                </div>
                <div className="col-span-1 text-xs text-green-600 font-medium">
                  {booking.vehicle?.registration || 'N/A'}
                </div>
                <div className="col-span-3 text-xs text-gray-700">
                  {truncateText(booking.pickup, 35)}
                </div>
                <div className="col-span-3 text-xs text-gray-700">
                  {truncateText(booking.destination, 35)}
                </div>
                <div className="col-span-1">
                  <Badge className={`text-xs px-1 py-0 ${getStatusColor(booking.status)}`}>
                    {booking.status === 'Advanced' ? 'Booked in Advance' : booking.status}
                  </Badge>
                </div>
                <div className="col-span-1 text-xs font-medium text-green-600">
                  £{booking.price?.toFixed(2) || '0.00'}
                </div>
                <div className="col-span-1 text-xs text-blue-600">
                  {booking.resolvedVehicleCallsign ? 
                    `Vehicle ${booking.resolvedVehicleCallsign}` : 
                    (booking.requestedVehicles?.length > 0 ? 'Vehicle TBA' : '')
                  }
                </div>
                <div className="col-span-1 text-xs text-blue-600">
                  {booking.resolvedDriverCallsign || 
                    (booking.requestedDrivers?.length > 0 ? 'TBA' : '')
                  }
                </div>
                <div className="col-span-1 text-xs text-gray-600 font-mono">
                  {booking.bookingId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}