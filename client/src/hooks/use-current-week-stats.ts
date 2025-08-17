import { useQuery } from '@tanstack/react-query';

interface CurrentWeekStatsResponse {
  success: boolean;
  error?: string;
  totalPrice?: number;
  totalJobs?: number;
  totalShifts?: number;
  totalHours?: string;
}

export function useCurrentWeekStats(vehicleCallsign: string | null) {
  // Calculate current week dates dynamically
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Sunday = 6 days back, others = day - 1
  
  const mondayOfThisWeek = new Date(today);
  mondayOfThisWeek.setDate(today.getDate() - daysToMonday);
  
  const sundayOfThisWeek = new Date(mondayOfThisWeek);
  sundayOfThisWeek.setDate(mondayOfThisWeek.getDate() + 6);
  
  const fromDate = mondayOfThisWeek.toISOString().split('T')[0];
  const toDate = sundayOfThisWeek.toISOString().split('T')[0];

  return useQuery<CurrentWeekStatsResponse>({
    queryKey: ['current-week-stats-v3', vehicleCallsign, fromDate, toDate],
    queryFn: async () => {
      if (!vehicleCallsign) {
        return { success: false, error: 'No vehicle callsign provided' };
      }
      
      console.log('🔍 Current week stats - DYNAMIC calendar week logic:', {
        vehicleCallsign,
        fromDate,
        toDate,
        weekDescription: `Current Week (${fromDate} to ${toDate})`,
        calculatedFrom: 'Monday to Sunday of current week'
      });

      const response = await fetch('/api/autocab/driver-shifts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromDate}T00:00:00Z`,
          to: `${toDate}T23:59:00Z`,
          viewByType: 'ByVehicle',
          vehicleFilter: vehicleCallsign
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('🔍 Current week stats API response:', {
        success: response.ok,
        totalPrice: data?.totals?.totalPrice || 0,
        totalJobs: data?.totals?.totalJobs || 0,
        totalShifts: data?.totals?.totalShifts || 0
      });

      return {
        success: true,
        totalPrice: data?.totals?.totalPrice || 0,
        totalJobs: data?.totals?.totalJobs || 0,
        totalShifts: data?.totals?.totalShifts || 0,
        totalHours: data?.totals?.shiftsLength || '0:00:00'
      };
    },
    enabled: !!vehicleCallsign,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}