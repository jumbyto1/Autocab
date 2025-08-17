import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, MapPin, Clock, User, X, Navigation, Phone, Calendar, Package, ArrowLeft, Briefcase } from "lucide-react";
import { useCurrentJob } from "@/hooks/use-current-job";
import { useWeeklyStats } from "@/hooks/use-weekly-stats";
import type { Vehicle } from "@/lib/types";

interface VehicleStatsPanelProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function VehicleStatsPanel({ vehicle, onClose }: VehicleStatsPanelProps) {
  const [currentView, setCurrentView] = useState<'stats' | 'job'>('stats');
  
  if (!vehicle) return null;

  // Fetch current job details for this vehicle
  const { data: currentJobData, isLoading: jobLoading, error: jobError } = useCurrentJob(vehicle.callsign);
  
  // Fetch real weekly statistics for this driver
  const { data: weeklyStatsData, isLoading: weeklyLoading, error: weeklyError } = useWeeklyStats(vehicle.driverCallsign || null);

  const getStatusColor = (statusColor?: string) => {
    switch (statusColor) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'gray': return 'bg-gray-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusText = (statusColor?: string) => {
    switch (statusColor) {
      case 'red': return 'In Job';
      case 'yellow': return 'En Route';
      case 'gray': return 'Break/Offline';
      case 'green': return 'Available';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="w-96 h-[80vh] border-l-4 border-l-blue-500 flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {currentView === 'job' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('stats')}
                className="h-6 w-6 p-0 mr-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.statusColor)}`} />
            Vehicle {vehicle.callsign}
            {currentView === 'job' && <span className="text-sm font-normal ml-1">- Job</span>}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {currentView === 'stats' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('job')}
            className="h-7 px-3 text-xs mt-2"
          >
            <Briefcase className="w-3 h-3 mr-1" />
            View Current Job
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-2 flex-1 overflow-y-auto p-3">
        {currentView === 'stats' ? (
          <>
            {/* Driver Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900 text-sm">Driver & Vehicle</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Driver:</span>
                  <div className="font-medium text-gray-900 break-words">
                    {vehicle.driverName || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium text-gray-900">
                    {getStatusText(vehicle.statusColor)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <div className="font-medium text-gray-900 break-words">
                    {vehicle.make} {vehicle.model}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Registration:</span>
                  <div className="font-medium text-gray-900">
                    {vehicle.registration}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Information */}
            {vehicle.coordinates && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900 text-sm">Location</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Coordinates:</span>
                    <div className="font-mono text-xs text-gray-900">
                      {typeof vehicle.coordinates.lat === 'number' ? vehicle.coordinates.lat.toFixed(6) : 'N/A'}, {typeof vehicle.coordinates.lng === 'number' ? vehicle.coordinates.lng.toFixed(6) : 'N/A'}
                    </div>
                  </div>
                  {vehicle.zone && (
                    <div>
                      <span className="text-gray-600">Zone:</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {vehicle.zone}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shift Statistics */}
            {vehicle.shiftStats && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900 text-sm">Today's Shift Statistics</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Jobs:</span>
                    <span className="font-medium text-green-600">{vehicle.shiftStats.cashBookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Jobs:</span>
                    <span className="font-medium text-blue-600">{vehicle.shiftStats.accountBookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Jobs:</span>
                    <span className="font-medium text-gray-900">
                      {vehicle.shiftStats.cashBookings + vehicle.shiftStats.accountBookings}
                    </span>
                  </div>
                  {vehicle.shiftDurationHours && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hours Logged:</span>
                      <span className="font-medium text-gray-900">
                        {typeof vehicle.shiftDurationHours === 'number' ? vehicle.shiftDurationHours.toFixed(1) : '0'}h
                      </span>
                    </div>
                  )}
                  
                  {/* Real AUTOCAB Earnings Data */}
                  <div className="border-t border-purple-200 pt-2 mt-2">
                    {weeklyLoading ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loading real earnings...</span>
                        <span className="text-sm text-gray-500">🔄</span>
                      </div>
                    ) : weeklyError || !weeklyStatsData?.success ? (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Today's Jobs:</span>
                          <span className="font-medium text-green-700">
                            {vehicle.shiftStats.cashBookings + vehicle.shiftStats.accountBookings} total
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Earnings:</span>
                          <span className="font-medium text-red-600">
                            API Required for Real Data
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* REAL Daily Earnings from AUTOCAB */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Today's Earnings:</span>
                          <span className="font-medium text-green-700">
                            £{typeof weeklyStatsData.weeklyStats?.totalEarnings === 'number' ? weeklyStatsData.weeklyStats.totalEarnings.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        
                        {/* REAL Weekly Earnings from AUTOCAB */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Week Earnings:</span>
                          <span className="font-medium text-blue-700">
                            £{typeof weeklyStatsData.weeklyStats?.totalEarnings === 'number' ? weeklyStatsData.weeklyStats.totalEarnings.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        
                        {/* REAL Weekly Jobs */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Week Jobs:</span>
                          <span className="font-medium text-purple-700">
                            {weeklyStatsData.weeklyStats?.weeklyJobs || 0} total
                          </span>
                        </div>
                        
                        {/* REAL Hourly Rate */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hourly Rate:</span>
                          <span className="font-medium text-orange-600">
                            £{typeof weeklyStatsData.weeklyStats?.totalEarnings === 'number' && typeof weeklyStatsData.weeklyStats?.weeklyHours === 'number' && weeklyStatsData.weeklyStats.weeklyHours > 0 ? (weeklyStatsData.weeklyStats.totalEarnings / weeklyStatsData.weeklyStats.weeklyHours).toFixed(2) : '0.00'}/h
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Activity Status */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-900 text-sm">Activity Status</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium">{vehicle.isActive ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suspended:</span>
                  <span className="font-medium">{vehicle.isSuspended ? 'Yes' : 'No'}</span>
                </div>
                {vehicle.vehicleType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{vehicle.vehicleType}</span>
                  </div>
                )}
                {vehicle.timeClear && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Clear:</span>
                    <span className="font-medium">{vehicle.timeClear}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Current Job Information */}
            {jobLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Loading job details...</div>
              </div>
            ) : jobError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-600">Error loading job details</div>
              </div>
            ) : currentJobData?.jobDetails ? (
              <div className="space-y-3">
                {/* Pickup Time */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">Pickup Time</span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {currentJobData.jobDetails.pickupTime || "at"}
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm">Customer</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <div className="font-medium text-gray-900 break-words">
                        {currentJobData.jobDetails.customerName || "Loading..."}
                      </div>
                    </div>
                    {currentJobData.jobDetails.passengers && (
                      <div>
                        <span className="text-gray-600">Passengers:</span>
                        <div className="font-medium text-gray-900">
                          {currentJobData.jobDetails.passengers}
                        </div>
                      </div>
                    )}
                    {currentJobData.jobDetails.price && (
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <div className="font-medium text-gray-900">
                          {currentJobData.jobDetails.price}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Journey Details */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900 text-sm">Journey</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Pickup:</span>
                      <div className="font-medium text-gray-900 break-words">
                        {currentJobData.jobDetails.pickup || "Loading..."}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Drop off:</span>
                      <div className="font-medium text-gray-900 break-words">
                        {currentJobData.jobDetails.dropoff || "Loading..."}
                      </div>
                    </div>
                    
                    {currentJobData.jobDetails.bookingId && (
                      <div>
                        <span className="text-gray-600">Booking ID:</span>
                        <div className="font-medium text-gray-900">
                          {currentJobData.jobDetails.bookingId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                {(currentJobData.jobDetails.passengers || currentJobData.jobDetails.price || currentJobData.jobDetails.driverNotes) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-900 text-sm">Details</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {currentJobData.jobDetails.passengers && (
                        <div>
                          <span className="text-gray-600">Passengers:</span>
                          <span className="font-medium text-gray-900 ml-2">{currentJobData.jobDetails.passengers}</span>
                        </div>
                      )}
                      {currentJobData.jobDetails.price && (
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium text-gray-900 ml-2">£{currentJobData.jobDetails.price}</span>
                        </div>
                      )}
                      {currentJobData.jobDetails.driverNotes && (
                        <div>
                          <span className="text-gray-600">Notes:</span>
                          <div className="font-medium text-gray-900 break-words">
                            {currentJobData.jobDetails.driverNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-500 text-center py-4">
                  No current job assigned
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}