import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Search, RefreshCw, Users, Car, MapPin, Clock, User, Eye, List } from 'lucide-react';

interface Booking {
  bookingId: string;
  pickup: string;
  destination: string;
  customerName: string;
  price: number;
  status: string;
  pickupTime?: string;
}

interface Assignment {
  driverId: string;
  driverName: string;
  vehicleCallsign: string;
  bookings: Booking[];
  totalJobs: number;
  authenticBookings: number;
}

export default function DriversAssignments() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch assignments using the dedicated endpoint
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch } = useQuery({
    queryKey: ['/api/drivers-assignments'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Function to manually refresh assignments with force refetch
  const refreshAssignments = async () => {
    await refetch();
  };

  // Use assignments from API
  const allAssignments = assignmentsData?.assignments || [];
  
  // Sort assignments: drivers with live jobs first, then by total jobs
  const sortedAssignments = allAssignments.sort((a, b) => {
    const aLiveJobs = a.bookings?.length || 0;
    const bLiveJobs = b.bookings?.length || 0;
    
    if (aLiveJobs > 0 && bLiveJobs === 0) return -1;
    if (bLiveJobs > 0 && aLiveJobs === 0) return 1;
    
    return bLiveJobs - aLiveJobs || b.totalJobs - a.totalJobs;
  });
  
  // Filter assignments based on search term
  const filteredAssignments = sortedAssignments.filter(assignment => {
    const matchesSearch = !searchTerm || 
      assignment.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.vehicleCallsign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.driverId?.includes(searchTerm);
    
    return matchesSearch;
  });

  // Stats
  const stats = {
    activeDrivers: allAssignments.length,
    liveJobs: allAssignments.reduce((sum, a) => sum + (a.bookings?.length || 0), 0),
    totalJobs: allAssignments.reduce((sum, a) => sum + a.totalJobs, 0),
    activeAssignments: allAssignments.filter(a => a.totalJobs > 0).length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 space-y-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Driver & Vehicle Assignments</h1>
              <p className="text-gray-600 dark:text-gray-400">Live assignments showing drivers and vehicles with active jobs</p>
            </div>
            <Button 
              onClick={refreshAssignments} 
              disabled={assignmentsLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {assignmentsLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Assignments
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeDrivers}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Drivers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.liveJobs}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Live Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.totalJobs}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.activeAssignments}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by driver name, vehicle, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {assignmentsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading assignments...</span>
          </div>
        )}

        {/* Assignments List */}
        {!assignmentsLoading && (
          <div className="space-y-6">
            {filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No assignments found</p>
                    <p className="text-sm">
                      {searchTerm ? 'Try adjusting your search terms' : 'No drivers currently have assigned jobs'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAssignments.map((assignment) => (
                <Card key={assignment.driverId} className="border-l-4 border-l-orange-500 shadow-sm">
                  {/* Driver Header */}
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full">
                          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-gray-900 dark:text-white">
                            {assignment.driverName}
                            {assignment.bookings?.length > 0 && (
                              <Badge variant="destructive" className="ml-2 bg-green-500">
                                LIVE
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                              <Car className="h-4 w-4" />
                              <span>Vehicle {assignment.vehicleCallsign}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                              <User className="h-4 w-4" />
                              <span>Driver ID: {assignment.driverId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1">
                          {assignment.totalJobs} Total Jobs
                        </Badge>
                        <Badge variant="outline" className={`px-3 py-1 ${
                          assignment.bookings?.length > 0 
                            ? 'border-green-300 text-green-700 dark:border-green-600 dark:text-green-400' 
                            : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-400'
                        }`}>
                          {assignment.bookings?.length || 0} Live Jobs
                        </Badge>
                        
                        {/* View Details Button - only show if there are live jobs */}
                        {assignment.bookings?.length > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                  <User className="h-5 w-5" />
                                  <span>Live Jobs - {assignment.driverName}</span>
                                  <Badge variant="outline" className="ml-2">Vehicle {assignment.vehicleCallsign}</Badge>
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                {assignment.bookings.map((booking, index) => (
                                  <Card key={booking.bookingId || index} className="border-l-4 border-l-blue-500">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                          <Badge variant="outline" className="font-mono">
                                            #{booking.bookingId}
                                          </Badge>
                                          <Badge variant={booking.status === 'Active' ? 'default' : 'secondary'}>
                                            {booking.status || 'Pending'}
                                          </Badge>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-2xl font-bold text-green-600">
                                            £{booking.price?.toFixed(2) || '0.00'}
                                          </p>
                                          {booking.pickupTime && (
                                            <p className="text-sm text-gray-500 flex items-center justify-end">
                                              <Clock className="h-4 w-4 mr-1" />
                                              {booking.pickupTime}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-start space-x-2">
                                            <MapPin className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                                            <div>
                                              <p className="text-xs text-gray-500 uppercase font-medium">PICKUP</p>
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {booking.pickup || 'N/A'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-start space-x-2">
                                            <MapPin className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                                            <div>
                                              <p className="text-xs text-gray-500 uppercase font-medium">DESTINATION</p>
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {booking.destination || 'N/A'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                            <div>
                                              <p className="text-xs text-gray-500 uppercase font-medium">CUSTOMER</p>
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {booking.customerName || 'N/A'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {/* Assigned Jobs Button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                              <List className="h-4 w-4 mr-1" />
                              Assigned Jobs
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <List className="h-5 w-5" />
                                <span>All Assigned Jobs - {assignment.driverName}</span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                  <p className="text-2xl font-bold text-blue-600">{assignment.totalJobs}</p>
                                  <p className="text-sm text-blue-600">Total Jobs Today</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                  <p className="text-2xl font-bold text-green-600">{assignment.bookings?.length || 0}</p>
                                  <p className="text-sm text-green-600">Currently Live</p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p><strong>Driver:</strong> {assignment.driverName}</p>
                                <p><strong>Vehicle:</strong> {assignment.vehicleCallsign}</p>
                                <p><strong>Driver ID:</strong> {assignment.driverId}</p>
                                <p><strong>Status:</strong> {assignment.bookings?.length > 0 ? '🟢 Active with Live Jobs' : '🟡 Available'}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>

                  <Separator />

                  {/* Quick Preview of Live Jobs */}
                  <CardContent className="pt-4">
                    {assignment.bookings?.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                          <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                          Live Jobs ({assignment.bookings.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {assignment.bookings.slice(0, 2).map((booking, index) => (
                            <div key={booking.bookingId || index} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge variant="outline" className="text-xs font-mono">
                                      #{booking.bookingId}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                      {booking.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    <MapPin className="h-3 w-3 inline mr-1 text-green-600" />
                                    {booking.pickup} 
                                    <span className="mx-2">→</span> 
                                    <MapPin className="h-3 w-3 inline mr-1 text-red-600" />
                                    {booking.destination}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <User className="h-3 w-3 inline mr-1" />
                                    {booking.customerName}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">
                                    £{booking.price?.toFixed(2) || '0.00'}
                                  </p>
                                  {booking.pickupTime && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {booking.pickupTime}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {assignment.bookings.length > 2 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                              +{assignment.bookings.length - 2} more jobs (click "View Details" to see all)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No live jobs currently assigned</p>
                        <p className="text-xs mt-1">Driver has {assignment.totalJobs} total jobs from shift data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}