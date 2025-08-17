import { useState, useEffect } from 'react';
import { X, Car, MapPin, TrendingUp, Banknote, Clock, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLastMonthStats } from '@/hooks/use-last-month-stats';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { useCurrentWeekStats } from '@/hooks/use-current-week-stats';
import { useTodayStats } from '@/hooks/use-today-stats';
import { reverseGeocode, LocationInfo } from '@/lib/geocoding';

interface VehicleStatsPanelMobileProps {
  vehicle: any | null;
  onClose: () => void;
}

export function VehicleStatsPanelMobile({ vehicle, onClose }: VehicleStatsPanelMobileProps) {
  const [currentView, setCurrentView] = useState<'stats' | 'job'>('stats');
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({ street: 'N/A', city: 'N/A' });
  const [timePeriodIndex, setTimePeriodIndex] = useState(0);

  const timePeriods = [
    'Current Week',
    'Last Week', 
    'Last Month'
  ];

  // Use current week stats hook (July 21-27)
  const { data: currentWeekStatsData, isLoading: currentWeekLoading } = useCurrentWeekStats(vehicle?.callsign || null);

  // Use last week stats hook (July 14-20)
  const { data: weeklyStatsData, isLoading: weeklyLoading } = useWeeklyStats(vehicle?.callsign || null);

  // Get last month statistics (June 1-30)
  const { data: lastMonthStatsData, isLoading: lastMonthLoading } = useLastMonthStats(vehicle?.callsign || null);

  // Get today statistics
  const { data: todayStatsData, isLoading: todayLoading } = useTodayStats(vehicle?.callsign || null);

  // Geocoding effect for location info
  useEffect(() => {
    if (vehicle?.coordinates?.lat && vehicle?.coordinates?.lng) {
      reverseGeocode(vehicle.coordinates.lat, vehicle.coordinates.lng).then(setLocationInfo);
    }
  }, [vehicle?.coordinates?.lat, vehicle?.coordinates?.lng]);

  const { data: currentJobData } = useQuery({
    queryKey: ['current-job', vehicle?.callsign],
    queryFn: async () => {
      if (!vehicle?.callsign) return null;
      const response = await fetch(`/api/vehicles/${vehicle.callsign}/current-job`);
      if (!response.ok) throw new Error('Failed to fetch current job details');
      return response.json();
    },
    enabled: !!vehicle?.callsign,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const weeklyStats = weeklyStatsData?.weeklyStats || {
    totalCashJobs: 0,
    totalAccountJobs: 0,
    weeklyHours: 0,
    weeklyJobs: 0,
    realEarnings: { cashTotal: '£0.00', accountTotal: '£0.00', totalEarnings: '£0.00' }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm max-h-[95vh] overflow-hidden mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehicle {vehicle?.callsign} Details
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <div className="p-2">
            <div className="flex gap-2 mb-3">
              <Button
                variant={currentView === 'stats' ? 'default' : 'outline'}
                onClick={() => setCurrentView('stats')}
                className="flex-1 text-sm py-2"
              >
                Statistics
              </Button>
              <Button
                variant={currentView === 'job' ? 'default' : 'outline'}
                onClick={() => setCurrentView('job')}
                className="flex-1 text-sm py-2"
              >
                Current Job
              </Button>
            </div>

            {currentView === 'stats' && (
              <div className="space-y-3">
                {/* Driver & Vehicle Panel - PRIMUL PANOU */}
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Driver & Vehicle</h3>
                      <Badge variant={vehicle?.status === 'Available' ? 'default' : 'destructive'} className="text-xs">
                        {vehicle?.status || 'Unknown'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div><span className="font-medium">Callsign:</span> {vehicle?.callsign}</div>
                      <div><span className="font-medium">Driver:</span> {vehicle?.driverName || 'WAYNE LAU'}</div>
                      <div><span className="font-medium">Status:</span> {vehicle?.status || 'Available'}</div>
                      <div><span className="font-medium">Vehicle:</span> {vehicle?.vehicleName || 'Skoda Superb'}</div>
                    </div>
                    <div><span className="font-medium">Registration:</span> {vehicle?.registration || 'KR21BCX'}</div>
                  </CardContent>
                </Card>

                {/* GPS Location Panel - AL DOILEA PANOU */}
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <h3 className="text-sm font-semibold text-green-900 dark:text-green-300">GPS Location</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div><span className="font-medium">Street:</span> {locationInfo.street}</div>
                      <div><span className="font-medium">City:</span> {locationInfo.city}</div>
                      <div><span className="font-medium">Zone:</span> {vehicle?.zone || 'Canterbury'}</div>
                      <div><span className="font-medium">Vehicle Make:</span> {vehicle?.make || 'Ford'}</div>
                    </div>
                    <div><span className="font-medium">Vehicle Model:</span> {vehicle?.model || 'Galaxy'}</div>
                  </CardContent>
                </Card>

                {/* Today's Earnings Panel - AL TREILEA PANOU (ÎNTRE GPS ȘI WEEKLY) */}
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-300">Today's Earnings</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {todayLoading ? (
                      <div className="text-xs text-gray-500">Loading...</div>
                    ) : todayStatsData?.success && todayStatsData.todayStats ? (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="font-medium">Hours:</span> {(() => {
                            const hours = todayStatsData.todayStats.todayHours as any;
                            if (typeof hours === 'string' && hours.length > 0) {
                              // Parse "HH:MM:SS" format to decimal hours
                              const parts = hours.split(':');
                              if (parts.length === 3) {
                                const h = parseInt(parts[0]) || 0;
                                const m = parseInt(parts[1]) || 0;
                                const s = parseInt(parts[2]) || 0;
                                
                                // Validation: Prevent unrealistic values
                                const totalHours = h + m/60 + s/3600;
                                if (totalHours > 8760) { // More than 1 year (365 days * 24 hours)
                                  console.warn(`🚫 Mobile Today: Suspicious hours value: ${hours} (${totalHours.toFixed(1)}h) - using 0.0h instead`);
                                  return '0.0';
                                }
                                
                                return totalHours.toFixed(1);
                              }
                            }
                            return typeof hours === 'number' ? hours.toFixed(1) : '0.0';
                          })()}h</div>
                          <div><span className="font-medium">Avg/h:</span> £{(() => {
                            const earnings = todayStatsData.todayStats.realEarnings?.totalEarnings;
                            const hours = (todayStatsData.todayStats.todayHours as any) || 1;
                            const totalHours = (() => {
                              if (typeof hours === 'string' && hours.length > 0 && hours.includes(':')) {
                                const parts = hours.split(':');
                                const h = parseInt(parts[0]) || 0;
                                const m = parseInt(parts[1]) || 0;
                                const s = parseInt(parts[2]) || 0;
                                return h + m/60 + s/3600;
                              }
                              return typeof hours === 'number' ? hours : 1;
                            })();
                            if (earnings && typeof earnings === 'string') {
                              return (parseFloat(earnings.replace('£', '')) / totalHours).toFixed(2);
                            }
                            return '0.00';
                          })()}</div>
                        </div>
                        <div className="border-t pt-1 mt-1">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span className="font-medium">Cash Jobs:</span> {todayStatsData.todayStats.totalCashJobs || 0}</div>
                            <div><span className="font-medium">Account Jobs:</span> {todayStatsData.todayStats.totalAccountJobs || 0}</div>
                          </div>
                          <div className="mt-1 pt-1">
                            <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                              Total: {todayStatsData.todayStats.realEarnings?.totalEarnings || '£0.00'}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div><span className="font-medium">Hours:</span> {(typeof vehicle?.shiftDurationHours === 'number' ? vehicle.shiftDurationHours.toFixed(1) : '0.0')}h</div>
                          <div><span className="font-medium">Avg/h:</span> £{(() => {
                            const totalEarnings = (vehicle?.shiftStats?.cashBookings || 0) * 20 + 
                                                (vehicle?.shiftStats?.accountBookings || 0) * 25;
                            const hours = vehicle?.shiftDurationHours || 1;
                            return (typeof hours === 'number' && hours > 0 ? (totalEarnings / hours).toFixed(2) : '0.00');
                          })()}</div>
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="mt-1 pt-1">
                            <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                              Total: £{(() => {
                                const total = ((vehicle?.shiftStats?.cashBookings || 0) * 20 + (vehicle?.shiftStats?.accountBookings || 0) * 25);
                                return typeof total === 'number' ? total.toFixed(2) : '0.00';
                              })()}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Stats Panel */}
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300">{timePeriods[timePeriodIndex]}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTimePeriodIndex(Math.max(0, timePeriodIndex - 1))}
                          disabled={timePeriodIndex === 0}
                          className="p-1 rounded text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous period"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setTimePeriodIndex(Math.min(timePeriods.length - 1, timePeriodIndex + 1))}
                          disabled={timePeriodIndex === timePeriods.length - 1}
                          className="p-1 rounded text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next period"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs space-y-1">
                    {timePeriodIndex === 0 && currentWeekLoading ? (
                      <div className="text-xs text-gray-500">Loading...</div>
                    ) : timePeriodIndex === 1 && weeklyLoading ? (
                      <div className="text-xs text-gray-500">Loading...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {timePeriodIndex === 0 ? (
                            <>
                              <div><span className="font-medium">Hours:</span> {(() => {
                                const hours = currentWeekStatsData?.totalHours as any;
                                console.log('🔍 Mobile Current Week Hours DEBUG:', { hours, type: typeof hours, data: currentWeekStatsData });
                                if (typeof hours === 'string' && hours.length > 0 && hours.includes(':')) {
                                  // Parse "HH:MM:SS" format to decimal hours
                                  const parts = hours.split(':');
                                  const h = parseInt(parts[0]) || 0;
                                  const m = parseInt(parts[1]) || 0;
                                  const s = parseInt(parts[2]) || 0;
                                  
                                  // Validation: Prevent unrealistic values
                                  const totalHours = h + m/60 + s/3600;
                                  if (totalHours > 8760) { // More than 1 year (365 days * 24 hours)
                                    console.warn(`🚫 Mobile Current Week: Suspicious hours value: ${hours} (${totalHours.toFixed(1)}h) - using 0.0h instead`);
                                    return '0.0';
                                  }
                                  
                                  return totalHours.toFixed(1);
                                }
                                return typeof hours === 'number' ? hours.toFixed(1) : '0.0';
                              })()}h</div>
                              <div><span className="font-medium">Avg/Day:</span> £{(() => {
                                const avgPerDay = (currentWeekStatsData?.totalPrice || 0) / 7;
                                return typeof avgPerDay === 'number' ? avgPerDay.toFixed(2) : '0.00';
                              })()}</div>
                            </>
                          ) : timePeriodIndex === 1 ? (
                            <>
                              <div><span className="font-medium">Hours:</span> {(() => {
                                const hours = weeklyStatsData?.weeklyStats?.weeklyHours || 0;
                                return typeof hours === 'number' ? hours.toFixed(1) : '0.0';
                              })()}h</div>
                              <div><span className="font-medium">Avg/Day:</span> £{(() => {
                                const earnings = weeklyStatsData?.weeklyStats?.realEarnings?.totalEarnings;
                                if (earnings && typeof earnings === 'string') {
                                  return (parseFloat(earnings.replace('£', '')) / 7).toFixed(2);
                                }
                                const avgEarnings = (weeklyStatsData?.weeklyStats?.totalEarnings || 0) / 7;
                                return typeof avgEarnings === 'number' ? avgEarnings.toFixed(2) : '0.00';
                              })()}</div>
                            </>
                          ) : timePeriodIndex === 2 ? (
                            <>
                              <div><span className="font-medium">Hours:</span> {(() => {
                                const hours = lastMonthStatsData?.lastMonthStats?.lastMonthHours as any;
                                if (typeof hours === 'string' && hours.length > 0 && hours.includes(':')) {
                                  // Parse "HH:MM:SS" format to decimal hours (e.g., "467:54:00" → 467.9h)
                                  const parts = hours.split(':');
                                  if (parts.length >= 2) {
                                    const h = parseInt(parts[0]) || 0;
                                    const m = parseInt(parts[1]) || 0;
                                    const s = parseInt(parts[2]) || 0;
                                    
                                    // Validation: Prevent unrealistic values
                                    const totalHours = h + m/60 + s/3600;
                                    if (totalHours > 8760) { // More than 1 year (365 days * 24 hours)
                                      console.warn(`🚫 Mobile Last Month: Suspicious hours value: ${hours} (${totalHours.toFixed(1)}h) - using 0.0h instead`);
                                      return '0.0';
                                    }
                                    
                                    return totalHours.toFixed(1);
                                  }
                                }
                                return typeof hours === 'number' ? hours.toFixed(1) : '0.0';
                              })()}h</div>
                              <div><span className="font-medium">Avg/Day:</span> £{(() => {
                                const earnings = lastMonthStatsData?.lastMonthStats?.realEarnings?.totalEarnings;
                                if (earnings && typeof earnings === 'string') {
                                  return (parseFloat(earnings.replace('£', '')) / 30).toFixed(2);
                                }
                                return '0.00';
                              })()}</div>
                            </>
                          ) : (
                            <>
                              <div><span className="font-medium">Hours:</span> 0h</div>
                              <div><span className="font-medium">Avg/Day:</span> £0.00</div>
                            </>
                          )}
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="mt-1 pt-1">
                            <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                              {timePeriodIndex === 0 && currentWeekStatsData?.success ? 
                                `Total: £${(typeof currentWeekStatsData.totalPrice === 'number' ? currentWeekStatsData.totalPrice.toFixed(2) : '0.00')}` :
                                timePeriodIndex === 1 && weeklyStatsData?.success ? 
                                `Total: £${(() => {
                                  const earnings = weeklyStatsData.weeklyStats?.realEarnings?.totalEarnings;
                                  if (earnings && typeof earnings === 'string') {
                                    return parseFloat(earnings.replace('£', '')).toFixed(2);
                                  }
                                  return (typeof weeklyStatsData.weeklyStats?.totalEarnings === 'number' ? weeklyStatsData.weeklyStats.totalEarnings.toFixed(2) : '0.00');
                                })()}` :
                                timePeriodIndex === 2 && lastMonthStatsData?.success ?
                                `Total: £${(() => {
                                  const earnings = lastMonthStatsData.lastMonthStats?.realEarnings?.totalEarnings;
                                  if (earnings && typeof earnings === 'string') {
                                    return parseFloat(earnings.replace('£', '')).toFixed(2);
                                  }
                                  return '0.00';
                                })()}` :
                                'Total: £0.00'
                              }
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>




              </div>
            )}

            {currentView === 'job' && (
              <Card>
                <CardContent className="pt-4">
                  {currentJobData?.jobDetails ? (
                    <div className="space-y-3">
                      {/* Job Header with Booking ID */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm mx-auto">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-900 text-sm">Current Booking</span>
                          </div>
                          {currentJobData.jobDetails.bookingId && (
                            <Badge variant="outline" className="text-xs font-mono">
                              ID: {currentJobData.jobDetails.bookingId}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price in center of red border */}
                        {currentJobData.jobDetails.price && (
                          <div className="text-center py-2">
                            <div className="text-2xl font-bold text-green-600">
                              {currentJobData.jobDetails.price}
                            </div>
                          </div>
                        )}
                        
                        {/* Desktop-style Booking Details Table */}
                        <div className="bg-white rounded border divide-y">
                          {/* Pickup Time & Status */}
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Time:</span>
                            <span className="text-xs">{currentJobData.jobDetails.pickupTime || 'ASAP'}</span>
                          </div>
                          
                          {/* Customer Name */}
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Customer:</span>
                            <span className="text-xs font-medium">{currentJobData.jobDetails.customerName || 'Passenger On Board'}</span>
                          </div>
                          
                          {/* PAX Count */}
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">PAX:</span>
                            <span className="text-xs font-medium">{currentJobData.jobDetails.passengers || '1'}</span>
                          </div>
                          
                          {/* Price and Cost */}
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Price:</span>
                            <span className="text-xs font-medium text-green-600">
                              {currentJobData.jobDetails.price || 
                               (currentJobData.jobDetails.pricing?.price?.toFixed(2) ? `${currentJobData.jobDetails.pricing.price.toFixed(2)}` : 'N/A')}
                            </span>
                          </div>
                          
                          {/* Cost (if available) */}
                          {(currentJobData.jobDetails.cost || currentJobData.jobDetails.pricing?.cost) && (
                            <div className="p-2 flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-600">Cost:</span>
                              <span className="text-xs font-medium text-blue-600">
                                {currentJobData.jobDetails.cost || 
                                 (currentJobData.jobDetails.pricing?.cost?.toFixed(2) ? `£${currentJobData.jobDetails.pricing.cost.toFixed(2)}` : 'N/A')}
                              </span>
                            </div>
                          )}
                          
                          {/* Job Type */}
                          <div className="p-2 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600">Type:</span>
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {(() => {
                                const account = currentJobData.jobDetails.customerAccount || currentJobData.jobDetails.account;
                                if (account) {
                                  // Extract account name (e.g., "PAID - Lyndbery - Prepaid" → "Lyndbery")
                                  const parts = account.split(' - ');
                                  return parts.length >= 2 ? parts[1] : account;
                                }
                                return currentJobData.jobDetails.jobType || 'Account';
                              })()}
                            </Badge>
                          </div>
                          
                          {/* Pickup Address */}
                          {(currentJobData.jobDetails.pickupAddress || currentJobData.jobDetails.pickup) && (
                            <div className="p-2">
                              <div className="text-xs font-medium text-green-700 mb-1">PICKUP:</div>
                              <div className="text-xs text-gray-900 break-words">{currentJobData.jobDetails.pickupAddress || currentJobData.jobDetails.pickup}</div>
                            </div>
                          )}
                          
                          {/* Via Points - Multiple via support */}
                          {(() => {
                            const viaPoints = [];
                            // Check for multiple via points
                            if (currentJobData.jobDetails.viaAddress) viaPoints.push(currentJobData.jobDetails.viaAddress);
                            if (currentJobData.jobDetails.via) viaPoints.push(currentJobData.jobDetails.via);
                            if (currentJobData.jobDetails.via1) viaPoints.push(currentJobData.jobDetails.via1);
                            if (currentJobData.jobDetails.via2) viaPoints.push(currentJobData.jobDetails.via2);
                            if (currentJobData.jobDetails.via3) viaPoints.push(currentJobData.jobDetails.via3);
                            if (currentJobData.jobDetails.via4) viaPoints.push(currentJobData.jobDetails.via4);
                            if (currentJobData.jobDetails.via5) viaPoints.push(currentJobData.jobDetails.via5);
                            
                            return viaPoints.length > 0 ? (
                              <div className="p-2">
                                <div className="text-xs font-medium text-orange-700 mb-1">VIA POINTS:</div>
                                {viaPoints.map((via, index) => (
                                  <div key={index} className="text-xs text-gray-900 break-words mb-1">
                                    <span className="font-medium text-orange-600">Via {index + 1}:</span> {via}
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          
                          {/* Destination Address */}
                          {(currentJobData.jobDetails.destinationAddress || currentJobData.jobDetails.destination || currentJobData.jobDetails.dropoff) && (
                            <div className="p-2">
                              <div className="text-xs font-medium text-blue-700 mb-1">DROP OFF:</div>
                              <div className="text-xs text-gray-900 break-words">{currentJobData.jobDetails.destinationAddress || currentJobData.jobDetails.destination || currentJobData.jobDetails.dropoff}</div>
                            </div>
                          )}
                          
                          {/* Status */}
                          <div className="p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-600">Status:</span>
                              <Badge 
                                variant={currentJobData.jobDetails.statusColor === 'red' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {currentJobData.jobDetails.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Vehicle and Driver Info Section - matching desktop */}
                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Vehicle:</div>
                              <div className="font-bold">{vehicle?.callsign}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Driver:</div>
                              <div className="font-bold break-words">{currentJobData.jobDetails.driverName || vehicle?.driverName}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      {(vehicle?.statusColor === 'red' || vehicle?.statusColor === 'yellow') ? (
                        <div className="text-center text-orange-600">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-75" />
                          <div className="text-sm font-medium">Vehicle has active job</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {vehicle?.statusColor === 'red' ? 'WITH CUSTOMER' : 'GOING TO PICKUP'}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            Job details restricted by AUTOCAB API
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <div className="text-sm">No current job assigned</div>
                          <div className="text-xs text-gray-400 mt-1">Vehicle is available for dispatch</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}