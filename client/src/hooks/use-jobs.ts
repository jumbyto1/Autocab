import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Job, InsertJob, UpdateJob } from "@/lib/types";

export function useJobs() {
  const queryClient = useQueryClient();

  const jobs = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData: InsertJob) => {
      try {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(jobData),
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log('🔍 MUTATION ERROR DATA:', errorData);
          
          // For duplicate job errors (409), throw structured error
          if (response.status === 409 && errorData.isDuplicate) {
            const error = new Error(errorData.message);
            (error as any).status = response.status;
            (error as any).isDuplicate = errorData.isDuplicate;
            (error as any).existingJob = errorData.existingJob;
            console.log('🚀 THROWING STRUCTURED DUPLICATE ERROR:', error);
            throw error;
          } else {
            throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
          }
        }

        return response.json();
      } catch (error: any) {
        console.log('🚨 MUTATION ERROR CAUGHT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateJob }) => {
      const response = await apiRequest("PATCH", `/api/jobs/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/jobs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const getJob = async (id: number): Promise<Job | null> => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  };

  return {
    jobs: jobs.data || [],
    isLoading: jobs.isLoading,
    createJob: createJobMutation.mutateAsync,
    updateJob: updateJobMutation.mutateAsync,
    deleteJob: deleteJobMutation.mutateAsync,
    getJob,
    isCreating: createJobMutation.isPending,
    isUpdating: updateJobMutation.isPending,
    isDeleting: deleteJobMutation.isPending,
  };
}
