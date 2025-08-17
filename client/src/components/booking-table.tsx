import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookingData {
  bookingId: string;
  pickup: string;
  destination: string;
  account: string;
  name: string;
  zone: string;
  vehicleStatus: string;
  vehicle: string;
  cost: string;
  price: string;
  driver: string;
  statusColor: 'red' | 'yellow' | 'green' | 'gray';
  time: string;
  pax: number;
  jobType: string;
  bookingType: string;
}

interface BookingTableProps {
  vehicles: any[];
  className?: string;
}

export function BookingTable({ vehicles, className }: BookingTableProps) {
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real active bookings from AUTOCAB API
  useEffect(() => {
    const fetchActiveBookings = async () => {
      try {
        console.log('🔍 FETCHING REAL AUTOCAB BOOKINGS...');
        const response = await fetch('/api/autocab/active-bookings');
        const data = await response.json();
        
        if (data.success && data.bookings) {
          console.log(`✅ LOADED ${data.bookings.length} REAL AUTOCAB BOOKINGS:`, data.bookings);
          setRealBookings(data.bookings);
        } else {
          console.log('❌ No active bookings found');
          setRealBookings([]);
        }
      } catch (error) {
        console.error('❌ Error fetching active bookings:', error);
        setRealBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveBookings();
    
    // Refresh every 30 seconds to get latest booking data
    const interval = setInterval(fetchActiveBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  const generateBookingData = (vehicles: any[]): BookingData[] => {
    const bookings: BookingData[] = [];
    
    if (realBookings.length === 0) {
      return [];
    }

    // Create bookings directly from real booking data
    realBookings.forEach((bookingData, index) => {
      // Find the corresponding vehicle
      const matchingVehicle = vehicles.find(v => v.callsign === bookingData.vehicleCallsign);
      
      bookings.push({
        bookingId: bookingData.bookingId?.toString() || bookingData.id?.toString() || "Unknown",
        pickup: bookingData.pickup?.address?.text || bookingData.pickup || "Unknown pickup",
        destination: bookingData.destination?.address?.text || bookingData.destination || "Unknown destination",
        account: bookingData.account || "SGH-SAGA",
        name: bookingData.name || bookingData.customerName || "Passenger On Board",
        zone: bookingData.route || "---",
        vehicleStatus: "Active Job",
        vehicle: bookingData.vehicleCallsign || "Unknown",
        cost: bookingData.cost || bookingData.totalCost || (bookingData.pricing?.cost?.toFixed(2) ? `£${bookingData.pricing.cost.toFixed(2)}` : "N/A"),
        price: bookingData.price || bookingData.fare || (bookingData.pricing?.price?.toFixed(2) ? `£${bookingData.pricing.price.toFixed(2)}` : "N/A"),
        driver: bookingData.driverName || "Unknown Driver",
        statusColor: matchingVehicle?.statusColor || 'red',
        time: bookingData.time || "ASAP",
        pax: bookingData.passengers || 1,
        jobType: bookingData.jobType || "Account",
        bookingType: "Live Job"
      });
    });

    return bookings;
  };

  const bookings = generateBookingData(vehicles);

  if (isLoading) {
    return (
      <Card className={`${className} bg-gray-50 dark:bg-gray-900`}>
        <CardContent className="p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">Loading real AUTOCAB bookings...</p>
            <p className="text-xs mt-1">Fetching authentic booking data from AUTOCAB API</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className={`${className} bg-gray-50 dark:bg-gray-900`}>
        <CardContent className="p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No active bookings</p>
            <p className="text-xs mt-1">All vehicles are available or on break</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`${className} bg-gradient-to-b from-blue-50 to-green-50 border-none`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-blue-200 border-b border-blue-300">
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">ID</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Time</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Pickup</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Destination</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Customer</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">PAX</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Price</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Type</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Status</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800 border-r border-gray-300">Vehicle</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-800">Driver</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => (
              <tr 
                key={booking.bookingId}
                className={`border-b border-gray-300 hover:bg-blue-100 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                }`}
              >
                <td className="px-2 py-1 text-blue-700 font-medium border-r border-gray-300">{booking.bookingId}</td>
                <td className="px-2 py-1 text-gray-900 font-medium border-r border-gray-300">{booking.time}</td>
                <td className="px-2 py-1 text-gray-900 truncate max-w-32 border-r border-gray-300" title={booking.pickup}>
                  {booking.pickup}
                </td>
                <td className="px-2 py-1 text-gray-900 truncate max-w-32 border-r border-gray-300" title={booking.destination}>
                  {booking.destination}
                </td>
                <td className="px-2 py-1 text-gray-900 font-medium border-r border-gray-300">{booking.name}</td>
                <td className="px-2 py-1 text-gray-900 font-medium text-center border-r border-gray-300">{booking.pax}</td>
                <td className="px-2 py-1 text-gray-900 font-medium border-r border-gray-300">{booking.price}</td>
                <td className="px-2 py-1 border-r border-gray-300">
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-medium">
                    {booking.jobType}
                  </span>
                </td>
                <td className="px-2 py-1 border-r border-gray-300">
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-medium">
                    {booking.vehicleStatus}
                  </span>
                </td>
                <td className="px-2 py-1 text-gray-900 font-medium text-center border-r border-gray-300">
                  {booking.vehicle}
                </td>
                <td className="px-2 py-1 text-gray-900 text-center">{booking.driver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-2 py-1 bg-blue-100 border-t border-blue-300">
        <div className="flex justify-between items-center text-xs text-gray-700">
          <span>{bookings.length} active bookings</span>
          <span>Based on real vehicle status data from AUTOCAB API</span>
        </div>
      </div>
    </div>
  );
}