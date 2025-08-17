import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, User, Phone, Car } from 'lucide-react';

interface LiveBooking {
  id: string;
  pickupTime: string;
  pickup: string;
  destination: string;
  customerName: string;
  status: 'waiting' | 'assigned' | 'completed';
  vehicle?: string;
  driver?: string;
  priority: 'normal' | 'asap' | 'advance';
  reqVehicles: number;
  reqDrivers: number;
  cost: string;
  bookingId: string;
  company: string;
  type: string;
}

export function AutocabLiveBookings() {
  // For now, use jobs data and transform to live bookings format
  const { data: jobsData } = useQuery({
    queryKey: ['/api/jobs'],
    refetchInterval: 10000, // Refresh every 10 seconds for live data
  });

  const jobs = (jobsData as any)?.jobs || [];
  
  // Transform jobs to live bookings format
  const liveBookings: LiveBooking[] = jobs
    .filter((job: any) => job.status !== 'completed')
    .slice(0, 8) // Show only first 8 for live view
    .map((job: any) => ({
      id: job.id,
      pickupTime: `${job.date} ${job.time}`,
      pickup: job.pickup || 'Unknown',
      destination: job.destination || 'Unknown',
      customerName: job.customerName || 'Unknown',
      status: job.autocabBookingId ? 'assigned' : 'waiting',
      vehicle: job.autocabBookingId ? 'Assigned' : undefined,
      driver: job.autocabBookingId ? 'Assigned' : undefined,
      priority: job.time === 'ASAP' ? 'asap' : 'normal',
      reqVehicles: 1,
      reqDrivers: 1,
      cost: job.price || '0.00',
      bookingId: job.autocabBookingId || job.jobNumber || job.id,
      company: 'Cab & Co',
      type: 'ASAP Booking'
    }));

  return (
    <div className="h-full bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h4 className="font-semibold text-sm flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Live Bookings Queue ({liveBookings.length})
        </h4>
        <div className="text-xs text-gray-600 mt-1">
          Bookings waiting for driver assignment
        </div>
      </div>

      <div className="h-[calc(100%-60px)] overflow-y-auto">
        {liveBookings.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No bookings in queue</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {liveBookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-2 rounded border text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                  booking.status === 'waiting' 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={booking.priority === 'asap' ? 'destructive' : 'secondary'}
                      className="text-xs px-1 py-0"
                    >
                      {booking.priority === 'asap' ? 'ASAP' : 'ADV'}
                    </Badge>
                    <span className="font-mono text-xs">
                      {booking.pickupTime.slice(11, 16) || 'ASAP'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge 
                      variant={booking.status === 'waiting' ? 'destructive' : 'secondary'}
                      className="text-xs px-1 py-0"
                    >
                      {booking.status === 'waiting' ? 'WAITING' : 'ASSIGNED'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-start space-x-1">
                    <MapPin className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">
                      {booking.pickup}
                    </span>
                  </div>
                  
                  <div className="flex items-start space-x-1">
                    <MapPin className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">
                      {booking.destination}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-gray-600 truncate max-w-20">
                        {booking.customerName}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-500">£{booking.cost}</span>
                      <span className="text-gray-400">#{booking.bookingId.slice(-6)}</span>
                    </div>
                  </div>

                  {booking.status === 'assigned' && booking.vehicle && (
                    <div className="flex items-center space-x-1 pt-1 border-t border-gray-100">
                      <Car className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-700">
                        {booking.vehicle} - {booking.driver}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}