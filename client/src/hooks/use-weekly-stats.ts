import { useQuery } from '@tanstack/react-query';

interface WeeklyStats {
  weeklyHours: number;
  weeklyJobs: number;
  totalCashJobs: number;
  totalAccountJobs: number;
  rankJobs: number;
  totalEarnings: number;
  realEarnings: {
    cashTotal: string;
    accountTotal: string;
    rankTotal: string;
    totalEarnings: string;
  };
}

interface WeeklyStatsResponse {
  success: boolean;
  weeklyStats?: WeeklyStats;
  error?: string;
}

export function useWeeklyStats(vehicleCallsign: string | null) {
  // Calculate last week dates dynamically
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const mondayOfThisWeek = new Date(today);
  mondayOfThisWeek.setDate(today.getDate() - daysToMonday);
  
  // Last week = 7 days before this week
  const mondayOfLastWeek = new Date(mondayOfThisWeek);
  mondayOfLastWeek.setDate(mondayOfThisWeek.getDate() - 7);
  
  const sundayOfLastWeek = new Date(mondayOfLastWeek);
  sundayOfLastWeek.setDate(mondayOfLastWeek.getDate() + 6);
  
  const fromDate = mondayOfLastWeek.toISOString().split('T')[0];
  const toDate = sundayOfLastWeek.toISOString().split('T')[0];

  return useQuery<WeeklyStatsResponse>({
    queryKey: ['weekly-stats-v5', vehicleCallsign, fromDate, toDate],
    queryFn: async () => {
      if (!vehicleCallsign) {
        return { success: false, error: 'No vehicle callsign provided' };
      }
      
      console.log('🔍 Weekly stats - DYNAMIC last week calculation:', {
        vehicleCallsign,
        fromDate,
        toDate,
        period: `Last Week (${fromDate} to ${toDate})`,
        fullFromDate: `${fromDate}T00:00:00Z`,
        fullToDate: `${toDate}T23:59:00Z`,
        calculatedFrom: 'Monday to Sunday of previous week'
      });

      // Use EXACT same API call as Driver Shifts Report with View By Vehicle
      const response = await fetch('/api/autocab/driver-shifts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromDate}T00:00:00Z`,
          to: `${toDate}T23:59:00Z`,
          viewByType: 'ByVehicle',  // Use ByVehicle like Driver Shifts Report
          vehicleFilter: vehicleCallsign, // Filter by this specific vehicle
        }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'No weekly data available' };
        }
        throw new Error('Failed to fetch weekly statistics');
      }
      
      const data = await response.json();
      const totals = data.totals || {};
      
      console.log('🔍 WEEKLY STATS API RESPONSE - EXPECTED £3038.63:', {
        vehicleCallsign,
        totals,
        totalPrice: totals.totalPrice,
        cashPrice: totals.cashPrice,
        accountPrice: totals.accountPrice,
        expected: 3038.63,
        actual: totals.totalPrice,
        isCorrect: totals.totalPrice === 3038.63
      });
      
      // Convert shift length to hours (using same logic as driver-shifts-report)
      const convertTimeToMinutes = (timeString: string): number => {
        if (!timeString) return 0;
        
        let totalMinutes = 0;
        
        // Check for dot format (days.hours:minutes:seconds)
        if (timeString.includes('.')) {
          const [daysPart, timePart] = timeString.split('.');
          const days = parseInt(daysPart) || 0;
          
          if (days > 365) {
            return 0; // Suspicious data
          }
          
          totalMinutes += days * 24 * 60;
          
          if (timePart) {
            const [hours, minutes] = timePart.split(':');
            totalMinutes += (parseInt(hours) || 0) * 60;
            totalMinutes += parseInt(minutes) || 0;
          }
        } else if (/^\d+\s+\d+:/.test(timeString)) {
          const parts = timeString.split(' ');
          const days = parseInt(parts[0]) || 0;
          
          if (days > 365) {
            return 0;
          }
          
          totalMinutes += days * 24 * 60;
          
          if (parts[1]) {
            const [hours, minutes] = parts[1].split(':');
            totalMinutes += (parseInt(hours) || 0) * 60;
            totalMinutes += parseInt(minutes) || 0;
          }
        } else {
          const [hours, minutes] = timeString.split(':');
          totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
        }
        
        return totalMinutes;
      };
      
      const weeklyHours = convertTimeToMinutes(totals.shiftsLength || '') / 60;
      
      // Convert to expected format
      return {
        success: true,
        weeklyStats: {
          weeklyHours: Math.round(weeklyHours * 10) / 10,
          weeklyJobs: totals.totalJobs || 0,
          totalCashJobs: totals.cashJobs || 0,
          totalAccountJobs: totals.accountJobs || 0,
          rankJobs: totals.rankJobs || 0,
          totalEarnings: totals.totalPrice || 0,
          realEarnings: {
            cashTotal: `£${typeof (totals.cashPrice || 0) === 'number' ? (totals.cashPrice || 0).toFixed(2) : '0.00'}`,
            accountTotal: `£${typeof (totals.accountPrice || 0) === 'number' ? (totals.accountPrice || 0).toFixed(2) : '0.00'}`,
            rankTotal: `£${typeof (totals.rankPrice || 0) === 'number' ? (totals.rankPrice || 0).toFixed(2) : '0.00'}`,
            totalEarnings: `£${typeof (totals.totalPrice || 0) === 'number' ? (totals.totalPrice || 0).toFixed(2) : '0.00'}`
          }
        }
      };
    },
    enabled: !!vehicleCallsign,
    refetchInterval: false, // Disable auto-refresh for testing
    staleTime: 0, // Always fetch fresh data
  });
}