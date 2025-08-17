import { useQuery } from '@tanstack/react-query';

interface CurrentJobDetails {
  bookingId: string;
  pickupTime?: string;
  pickupDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerAccount?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  pickup?: string; // Alternative naming from backend
  destination?: string; // Alternative naming from backend
  dropoff?: string; // Alternative naming from backend
  viaPoints?: string[];
  price?: string;
  passengers?: number;
  vehicleType?: string;
  driverNotes?: string;
  jobNumber?: string;
  status?: string;
  statusColor?: string;
  driverName?: string;
  vehicleId?: string;
  jobType?: string;
  description?: string;
}

interface CurrentJobResponse {
  success: boolean;
  jobDetails?: CurrentJobDetails | null;
  message: string;
}

export function useCurrentJob(vehicleId: string | null) {
  return useQuery<CurrentJobResponse>({
    queryKey: ['current-job', vehicleId],
    queryFn: async () => {
      if (!vehicleId) {
        return { success: false, message: 'No vehicle ID provided' };
      }
      
      const response = await fetch(`/api/vehicles/${vehicleId}/current-job`);
      if (!response.ok) {
        throw new Error('Failed to fetch current job details');
      }
      return response.json();
    },
    enabled: !!vehicleId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}