import { useQuery } from '@tanstack/react-query';

interface LastMonthStats {
  lastMonthHours: number;
  lastMonthJobs: number;
  totalCashJobs: number;
  totalAccountJobs: number;
  rankJobs: number;
  realEarnings?: {
    cashTotal: string;
    rankTotal: string;
    accountTotal: string;
    totalEarnings: string;
  };
}

interface LastMonthStatsResponse {
  success: boolean;
  lastMonthStats?: LastMonthStats;
  error?: string;
}

export function useLastMonthStats(vehicleCallsign: string | null) {
  // Calculate last month dates dynamically
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // First day of last month
  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of last month
  
  const fromDate = lastMonth.toISOString().split('T')[0];
  const toDate = lastDayOfLastMonth.toISOString().split('T')[0];

  return useQuery<LastMonthStatsResponse>({
    queryKey: ['last-month-stats-v5', vehicleCallsign, fromDate, toDate],
    queryFn: async () => {
      if (!vehicleCallsign) {
        return { success: false, error: 'No vehicle callsign provided' };
      }
      
      console.log('🔍 Last month stats - DYNAMIC last month calculation:', {
        vehicleCallsign,
        fromDate,
        toDate,
        period: `Last Month (${fromDate} to ${toDate})`,
        calculatedFrom: 'First to last day of previous month'
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
          return { success: false, error: 'No last month data available' };
        }
        throw new Error('Failed to fetch last month statistics');
      }
      
      const data = await response.json();
      const totals = data.totals || {};
      
      console.log('🔍 Last month stats API response:', {
        vehicleCallsign,
        totals,
        totalPrice: totals.totalPrice,
        cashPrice: totals.cashPrice,
        accountPrice: totals.accountPrice
      });
      
      // Convert to expected format - FIX: Use shiftsLength for hours, not totalShifts
      return {
        success: true,
        lastMonthStats: {
          lastMonthHours: totals.shiftsLength || '0:00:00', // Use shiftsLength for authentic hours
          lastMonthJobs: totals.totalJobs || 0,
          totalCashJobs: totals.cashJobs || 0,
          totalAccountJobs: totals.accountJobs || 0,
          rankJobs: totals.rankJobs || 0,
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