import { useState, useEffect } from 'react';
import { X, Car, MapPin, TrendingUp, Banknote, Clock, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLastMonthStats } from '@/hooks/use-last-month-stats';
import { useTodayStats } from '@/hooks/use-today-stats';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { useCurrentWeekStats } from '@/hooks/use-current-week-stats';
import { reverseGeocode, LocationInfo } from '@/lib/geocoding';

interface VehicleStatsPanelProps {
  vehicle: any | null;
  onClose: () => void;
}

export function VehicleStatsPanel({ vehicle, onClose }: VehicleStatsPanelProps) {
  const [currentView, setCurrentView] = useState<'stats' | 'job' | 'history'>('stats');
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({ street: 'N/A', city: 'N/A' });
  const [timePeriodIndex, setTimePeriodIndex] = useState(0);

  const timePeriods = [
    'Current Week',
    'Last Week', 
    'Previous Week',
    '2 Weeks Ago',
    '3 Weeks Ago'
  ];

  // Use current week stats hook (July 21-27)
  const { data: currentWeekStatsData, isLoading: currentWeekLoading } = useCurrentWeekStats(vehicle?.callsign || null);

  // Use last week stats hook (July 14-20)
  const { data: weeklyStatsData, isLoading: weeklyLoading } = useWeeklyStats(vehicle?.callsign || null);

  // Get last month statistics (June 1-30)
  const { data: lastMonthStatsData, isLoading: lastMonthLoading } = useLastMonthStats(vehicle?.callsign || null);

  // Get today's statistics - DAILY EARNINGS ONLY
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

  // Get driver account details using AUTOCAB Accounts API
  const { data: driverAccountData } = useQuery({
    queryKey: ['/api/autocab/driver-accounts', vehicle?.driverId],
    enabled: !!vehicle?.driverId,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  // Get driver sheets history using AUTOCAB Driver Sheets History API
  const { data: driverHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/vehicles', vehicle?.callsign, 'driver-sheets-history'],
    queryFn: async () => {
      if (!vehicle?.callsign) return null;
      const response = await fetch(`/api/vehicles/${vehicle.callsign}/driver-sheets-history`);
      if (!response.ok) throw new Error('Failed to fetch driver history');
      return response.json();
    },
    enabled: !!vehicle?.callsign && currentView === 'history',
    refetchInterval: 60000,
    staleTime: 60000,
  });



  const { data: driverAccountsData } = useQuery({
    queryKey: ['/api/autocab/driver-accounts', vehicle?.driverId],
    enabled: !!vehicle?.driverId,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  if (!vehicle) return null;

  // Extract weekly stats data directly from API response
  const weeklyStats = weeklyStatsData?.weeklyStats || {
    totalCashJobs: 0,
    totalAccountJobs: 0,
    weeklyHours: 0,
    totalEarnings: 0,
    weeklyJobs: 0,
    realEarnings: {
      cashTotal: '£0.00',
      accountTotal: '£0.00',
      rankTotal: '£0.00',
      totalEarnings: '£0.00'
    }
  };

  // Debug logging
  console.log('🔍 WEEKLY STATS DEBUG:', {
    callsign: vehicle?.callsign,
    weeklyStatsData,
    weeklyStats,
    isLoading: weeklyLoading
  });

  return (
    <Card className="h-full flex flex-col bg-white border shadow-lg max-w-2xl mx-auto">
      <CardHeader className="flex-shrink-0 border-b bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-lg">Vehicle {vehicle.callsign} Statistics</span>
            <Badge variant={vehicle.statusColor === 'green' ? 'default' : 
                           vehicle.statusColor === 'red' ? 'destructive' : 'secondary'}>
              {vehicle.readableStatus || vehicle.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
              Hide
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant={currentView === 'stats' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('stats')}
          >
            Statistics
          </Button>
          <Button
            variant={currentView === 'job' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('job')}
          >
            Current Job
          </Button>
          <Button
            variant={currentView === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('history')}
          >
            Driver History
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3 overflow-y-auto">
        {currentView === 'stats' ? (
          <div className="space-y-4">
            {/* Grid-ul de 6 paneluri (2x3 layout) - fără Current Booking și Today's Stats */}
            <div className="grid grid-cols-2 gap-3">
              {/* Panel 1 - Driver & Vehicle (compact like Today's Earnings) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-900 text-xs">Driver & Vehicle</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div><strong>Callsign:</strong> {vehicle.callsign || 'N/A'}</div>
                  <div><strong>Driver:</strong> {vehicle.driverName || vehicle.driver || 'N/A'}</div>
                  <div><strong>Status:</strong> {vehicle.readableStatus || vehicle.status || 'N/A'}</div>
                </div>
              </div>

              {/* Panel 2 - GPS Location (compact) */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-900 text-xs">GPS Location</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div><strong>Street:</strong> {locationInfo.street}</div>
                  <div><strong>City:</strong> {locationInfo.city}</div>
                  <div><strong>Zone:</strong> {vehicle.zone || 'Canterbury'}</div>
                </div>
              </div>

              {/* Panel 3 - Current Week Earnings (July 21-27) */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-900 text-xs">Current Week</span>
                </div>
                {currentWeekLoading ? (
                  <div className="text-xs text-gray-500">Loading...</div>
                ) : currentWeekStatsData?.success ? (
                  <div className="space-y-0.5 text-xs">
                    <div><strong>Hours:</strong> {(() => {
                      const hours = currentWeekStatsData.totalHours;
                      if (typeof hours === 'string') {
                        // Parse "HH:MM:SS" format to decimal hours
                        const parts = hours.split(':');
                        const h = parseInt(parts[0]) || 0;
                        const m = parseInt(parts[1]) || 0;
                        const s = parseInt(parts[2]) || 0;
                        
                        // Validation: Prevent unrealistic values
                        const totalHours = h + m/60 + s/3600;
                        if (totalHours > 8760) { // More than 1 year (365 days * 24 hours)
                          console.warn(`🚫 Suspicious hours value: ${hours} (${totalHours.toFixed(1)}h) - using 0.0h instead`);
                          return '0.0';
                        }
                        
                        return totalHours.toFixed(1);
                      }
                      if (typeof hours === 'number' && !isNaN(hours)) {
                        // Additional validation for numeric values
                        if (hours > 8760) {
                          console.warn(`🚫 Suspicious numeric hours: ${hours}h - using 0.0h instead`);
                          return '0.0';
                        }
                        return hours.toFixed(1);
                      }
                      return '0.0';
                    })()}h</div>
                    <div className="font-bold text-green-700"><strong>Earnings:</strong> £{(typeof currentWeekStatsData.totalPrice === 'number' && !isNaN(currentWeekStatsData.totalPrice)) ? currentWeekStatsData.totalPrice.toFixed(2) : '0.00'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No data</div>
                )}
              </div>

              {/* Panel 4 - Vehicle Info (compact) */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-orange-600" />
                  <span className="font-medium text-orange-900 text-xs">Vehicle Info</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div><strong>Registration:</strong> {vehicle.registration || vehicle.reg || 'N/A'}</div>
                  <div><strong>Vehicle Make:</strong> {vehicle.make || 'Ford'}</div>
                  <div><strong>Vehicle Model:</strong> {vehicle.model || 'Galaxy'}</div>
                </div>
              </div>

              {/* Panel 5 - Last Week Earnings (July 14-20) */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-indigo-600" />
                  <span className="font-medium text-indigo-900 text-xs">Last Week</span>
                </div>
                {weeklyLoading ? (
                  <div className="text-xs text-gray-500">Loading...</div>
                ) : weeklyStatsData?.success ? (
                  <div className="space-y-0.5 text-xs">
                    <div><strong>Hours:</strong> {typeof weeklyStatsData.weeklyStats?.weeklyHours === 'number' && !isNaN(weeklyStatsData.weeklyStats.weeklyHours) ? weeklyStatsData.weeklyStats.weeklyHours.toFixed(1) : '0.0'}h</div>
                    <div className="font-bold text-indigo-700"><strong>Earnings:</strong> £{(() => {
                      const earnings = weeklyStatsData.weeklyStats?.realEarnings?.totalEarnings;
                      if (earnings && typeof earnings === 'string') {
                        const parsed = parseFloat(earnings.replace('£', ''));
                        return !isNaN(parsed) ? parsed.toFixed(2) : '0.00';
                      }
                      const totalEarnings = weeklyStatsData.weeklyStats?.totalEarnings || 0;
                      return typeof totalEarnings === 'number' && !isNaN(totalEarnings) ? totalEarnings.toFixed(2) : '0.00';
                    })()}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No data</div>
                )}
              </div>

              {/* Panel 6 - Last Month Earnings (June 1-30) */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-violet-600" />
                  <span className="font-medium text-violet-900 text-xs">Last Month</span>
                </div>
                {lastMonthLoading ? (
                  <div className="text-xs text-gray-500">Loading...</div>
                ) : lastMonthStatsData?.success ? (
                  <div className="space-y-0.5 text-xs">
                    <div><strong>Hours:</strong> {typeof lastMonthStatsData.lastMonthStats?.lastMonthHours === 'number' && !isNaN(lastMonthStatsData.lastMonthStats.lastMonthHours) ? lastMonthStatsData.lastMonthStats.lastMonthHours.toFixed(1) : '0.0'}h</div>
                    <div className="font-bold text-violet-700"><strong>Earnings:</strong> £{(() => {
                      const earnings = lastMonthStatsData.lastMonthStats?.realEarnings?.totalEarnings;
                      if (earnings && typeof earnings === 'string') {
                        const parsed = parseFloat(earnings.replace('£', ''));
                        return !isNaN(parsed) ? parsed.toFixed(2) : '0.00';
                      }
                      const totalPrice = (lastMonthStatsData.lastMonthStats as any)?.totalPrice || 0;
                      return typeof totalPrice === 'number' && !isNaN(totalPrice) ? totalPrice.toFixed(2) : '0.00';
                    })()}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No data</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Today's Earnings - Using dedicated TODAY API */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900 text-sm">Today's Earnings</span>
                </div>
                {todayLoading ? (
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-500">Loading today's data...</div>
                  </div>
                ) : todayStatsData?.success && todayStatsData.todayStats ? (
                  <>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-700">
                          {todayStatsData.todayStats.totalCashJobs || 0}
                        </div>
                        <div className="text-green-600">Cash</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-blue-700">
                          {todayStatsData.todayStats.totalAccountJobs || 0}
                        </div>
                        <div className="text-blue-600">Account</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-purple-700">
                          {todayStatsData.todayStats.rankJobs || 0}
                        </div>
                        <div className="text-purple-600">Rank</div>
                      </div>
                    </div>
                    <div className="text-center mt-2 pt-2 border-t border-green-200">
                      <div className="font-bold text-xl text-gray-800">
                        {todayStatsData.todayStats.todayJobs || 0}
                      </div>
                      <div className="text-green-600 text-xs">Total Jobs</div>
                    </div>
                    
                    {/* Real earnings or fallback calculation */}
                    <div className="text-center mt-2 pt-2 border-t border-green-200">
                      <div className="font-bold text-xl text-green-700">
                        {todayStatsData.todayStats.realEarnings ? 
                          todayStatsData.todayStats.realEarnings.totalEarnings :
                          (() => {
                            const calculated = (
                              (todayStatsData.todayStats.totalCashJobs || 0) * 20 + 
                              (todayStatsData.todayStats.totalAccountJobs || 0) * 25 + 
                              (todayStatsData.todayStats.rankJobs || 0) * 22
                            );
                            return !isNaN(calculated) ? `£${calculated.toFixed(0)}` : '£0';
                          })()
                        }
                      </div>
                      <div className="text-green-600 text-xs">Today's Earnings</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-500">
                      {todayStatsData?.error || 'No today data available'}
                    </div>
                  </div>
                )}
              </div>
              
              {vehicle.shiftDurationHours && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm">Shift Hours</span>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-2xl text-blue-700">
                      {typeof vehicle.shiftDurationHours === 'number' && !isNaN(vehicle.shiftDurationHours) ? vehicle.shiftDurationHours.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-blue-600 text-xs">Hours Logged</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'job' ? (
          <div className="p-3">
            {currentJobData?.jobDetails ? (
              <div className="space-y-3">
                {/* Job Header with Booking ID */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md mx-auto">
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
                      <div className="text-3xl font-bold text-green-600">
                        {currentJobData.jobDetails.price}
                      </div>
                    </div>
                  )}
                  
                  {/* Booking Details Table Style */}
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
                        <div className="text-xs text-gray-900">{currentJobData.jobDetails.pickupAddress || currentJobData.jobDetails.pickup}</div>
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
                            <div key={index} className="text-xs text-gray-900 mb-1">
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
                        <div className="text-xs text-gray-900">{currentJobData.jobDetails.destinationAddress || currentJobData.jobDetails.destination || currentJobData.jobDetails.dropoff}</div>
                      </div>
                    )}
                    
                    {/* Job Details Row - Enhanced with Cost */}
                    <div className="p-2 grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-600">PAX:</span>
                        <span className="ml-1">{currentJobData.jobDetails.passengers || '1'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Price:</span>
                        <span className="ml-1 font-medium text-green-700">
                          {currentJobData.jobDetails.price || 
                           (currentJobData.jobDetails.pricing?.price?.toFixed(2) ? `£${currentJobData.jobDetails.pricing.price.toFixed(2)}` : 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Cost:</span>
                        <span className="ml-1 font-medium text-blue-700">
                          {currentJobData.jobDetails.cost || 
                           (currentJobData.jobDetails.pricing?.cost?.toFixed(2) ? `£${currentJobData.jobDetails.pricing.cost.toFixed(2)}` : 'N/A')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Type:</span>
                        <span className="ml-1">{(() => {
                          const account = currentJobData.jobDetails.customerAccount || currentJobData.jobDetails.account;
                          if (account) {
                            // Extract account name (e.g., "PAID - Lyndbery - Prepaid" → "Lyndbery")
                            const parts = account.split(' - ');
                            return parts.length >= 2 ? parts[1] : account;
                          }
                          return currentJobData.jobDetails.jobType || 'Account';
                        })()}</span>
                      </div>
                    </div>
                    
                    {/* Job Status */}
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
                  
                  {/* Vehicle and Driver Info Section - matching the image format */}
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Vehicle:</span>
                        <span className="font-bold text-gray-900">{vehicle?.callsign}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Driver:</span>
                        <span className="font-bold text-gray-900">{currentJobData.jobDetails.driverName || vehicle?.driverName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
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
          </div>
        ) : currentView === 'history' ? (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-900 text-sm">Driver Sheets History (Last 30 Days)</span>
              </div>
              
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500">Loading driver history...</div>
                </div>
              ) : driverHistoryData?.success ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs mb-3">
                    <span className="font-medium text-gray-600">Total Sheets:</span>
                    <span className="font-bold text-orange-700">{driverHistoryData.totalSheets || 0}</span>
                  </div>
                  
                  {driverHistoryData.sheets && driverHistoryData.sheets.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {driverHistoryData.sheets.slice(0, 10).map((sheet: any, index: number) => (
                        <div key={index} className="bg-white border border-orange-200 rounded p-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Date:</span>
                              <div className="text-gray-900">{new Date(sheet.date || sheet.started).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Shift Length:</span>
                              <div className="text-gray-900">{sheet.shiftLength || 'N/A'}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Cash Jobs:</span>
                              <div className="text-green-700 font-medium">{sheet.cashBookings || 0}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Account Jobs:</span>
                              <div className="text-blue-700 font-medium">{sheet.accountBookings || 0}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total Jobs:</span>
                              <div className="text-gray-900 font-bold">{(sheet.cashBookings || 0) + (sheet.accountBookings || 0)}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Earnings:</span>
                              <div className="text-green-700 font-bold">£{sheet.completedJobsTotal || '0.00'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500">No shift history found for the last 30 days</div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-orange-200">
                    Period: {driverHistoryData.period?.from ? new Date(driverHistoryData.period.from).toLocaleDateString() : 'N/A'} - {driverHistoryData.period?.to ? new Date(driverHistoryData.period.to).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50 text-orange-400" />
                  <div className="text-sm text-gray-500">Failed to load driver history</div>
                  <div className="text-xs text-gray-400 mt-1">{driverHistoryData?.message || 'API error occurred'}</div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}