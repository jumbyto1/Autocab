import { useQuery } from '@tanstack/react-query';

interface TodayStats {
  todayHours: number;
  todayJobs: number;
  totalCashJobs: number;
  totalAccountJobs: number;
  rankJobs: number;
  // Real earnings from AUTOCAB API when available
  realEarnings?: {
    cashTotal: string;
    rankTotal: string;
    accountTotal: string;
    totalEarnings: string;
  };
}

interface TodayStatsResponse {
  success: boolean;
  todayStats?: TodayStats;
  error?: string;
}

export function useTodayStats(vehicleCallsign: string | null) {
  return useQuery<TodayStatsResponse>({
    queryKey: ['today-stats', vehicleCallsign],
    queryFn: async () => {
      if (!vehicleCallsign) {
        return { success: false, error: 'No vehicle callsign provided' };
      }
      
      const response = await fetch(`/api/vehicles/${vehicleCallsign}/today-stats`);
      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'No today data available' };
        }
        throw new Error('Failed to fetch today statistics');
      }
      return response.json();
    },
    enabled: !!vehicleCallsign,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for testing
    staleTime: 0, // Always fetch fresh data
  });
}