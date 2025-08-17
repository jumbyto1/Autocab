import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AutocabResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  isDuplicate?: boolean;
  source?: string;
  existingJob?: any;
}

export function useAutocab() {
  const sendToAutocabMutation = useMutation({
    mutationFn: async ({ jobId, force = false }: { jobId: number; force?: boolean }): Promise<AutocabResponse> => {
      console.log(`🎯 FRONTEND: Starting AUTOCAB submission for jobId=${jobId}, force=${force}`);
      const url = force ? `/api/autocab/send/${jobId}?force=true` : `/api/autocab/send/${jobId}`;
      console.log(`🎯 FRONTEND: Making request to URL: ${url}`);
      
      const response = await apiRequest(url, { method: "POST" });
      console.log(`🎯 FRONTEND: Response status: ${response.status}`);
      
      const result = await response.json();
      console.log(`🎯 FRONTEND: Response result:`, result);
      
      // Handle duplicate detection (409 status)
      if (response.status === 409 && result.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          source: result.source,
          existingJob: result.existingJob,
          message: result.message
        };
      }
      
      return result;
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (): Promise<AutocabResponse> => {
      const response = await apiRequest("/api/autocab/test");
      return response.json();
    },
  });

  const getBookingDetailsMutation = useMutation({
    mutationFn: async (bookingId: string): Promise<any> => {
      const response = await apiRequest(`/api/autocab/booking/${bookingId}`);
      return response.json();
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, bookingData }: { bookingId: string; bookingData: any }): Promise<AutocabResponse> => {
      const response = await apiRequest(`/api/autocab/booking/${bookingId}`, { 
        method: "POST", 
        body: JSON.stringify(bookingData),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
  });

  return {
    sendToAutocab: sendToAutocabMutation.mutateAsync,
    testConnection: testConnectionMutation.mutateAsync,
    getBookingDetails: getBookingDetailsMutation.mutateAsync,
    updateBooking: updateBookingMutation.mutateAsync,
    isSending: sendToAutocabMutation.isPending,
    isTesting: testConnectionMutation.isPending,
    isFetchingDetails: getBookingDetailsMutation.isPending,
    isUpdating: updateBookingMutation.isPending,
  };
}
