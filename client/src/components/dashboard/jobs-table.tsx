import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Send, Trash2, CheckSquare, Square, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job } from "@/lib/types";

export function JobsTable() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [contextMenuJob, setContextMenuJob] = useState<number | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const filteredJobs = jobs.filter(job =>
    job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.driver?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Smart delete mutation with Autocab checking
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      console.log(`🗑️ SMART DELETE INITIATED - Job ID: ${jobId}`);
      
      // First, get the job details to check booking ID
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error(`Failed to fetch job ${jobId} details`);
      }
      
      const job = await jobResponse.json();
      console.log(`📋 JOB DETAILS:`, job);
      
      // Check if job has booking ID (exists in Autocab)
      if (job.autocabBookingId && job.sentToAutocab) {
        console.log(`🔍 JOB ${jobId} IS LIVE IN AUTOCAB - Booking ID: ${job.autocabBookingId}`);
        
        // Show confirmation dialog for live Autocab jobs
        const confirmed = confirm(
          `Are you sure you want to delete this job? Booking ID ${job.autocabBookingId} is live in Autocab.`
        );
        
        if (!confirmed) {
          console.log(`❌ USER CANCELLED DELETE for live Autocab job ${jobId}`);
          throw new Error('Delete cancelled by user');
        }
        
        console.log(`🗑️ USER CONFIRMED DELETE for live Autocab job ${jobId} (Booking ID: ${job.autocabBookingId})`);
      } else {
        console.log(`⚡ JOB ${jobId} NOT IN AUTOCAB - Proceeding with instant deletion`);
      }

      // Proceed with deletion
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete job ${jobId}: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: (result, jobId) => {
      console.log(`✅ Job ${jobId} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: `Job ${jobId} deleted successfully`,
      });
    },
    onError: (error: any, jobId) => {
      if (error.message !== 'Delete cancelled by user') {
        console.error(`❌ SMART DELETE ERROR for job ${jobId}:`, error);
        toast({
          title: "Error",
          description: `Failed to delete job ${jobId}`,
          variant: "destructive",
        });
      }
    }
  });

  const sendJobsToAutocabMutation = useMutation({
    mutationFn: async (jobIds: number[]) => {
      console.log(`📤 Bulk sending ${jobIds.length} jobs to Autocab:`, jobIds);
      const results = await Promise.allSettled(
        jobIds.map(async (id) => {
          const response = await fetch(`/api/autocab/send/${id}`, { method: 'POST' });
          if (!response.ok) {
            throw new Error(`Failed to send job ${id}: ${response.statusText}`);
          }
          return await response.json();
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`✅ Bulk send results: ${successful} successful, ${failed} failed`);
      
      return { successful, failed, results };
    },
    onSuccess: (data) => {
      const selectedCount = selectedJobs.size;
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJobs(new Set());
      
      if (data.failed > 0) {
        toast({
          title: "Partial Success",
          description: `${data.successful} jobs sent successfully, ${data.failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${selectedCount} jobs sent to Autocab successfully`,
        });
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJobs(new Set());
      toast({
        title: "Error",
        description: error.message || "Failed to send jobs to Autocab",
        variant: "destructive",
      });
    }
  });

  // Bulk delete local jobs mutation (using new endpoint)
  const bulkDeleteLocalMutation = useMutation({
    mutationFn: async () => {
      console.log(`🗑️ BULK DELETE LOCAL: Deleting all local jobs (not sent to Autocab)`);
      const response = await fetch('/api/jobs/bulk-delete-local', { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to bulk delete local jobs: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log(`✅ BULK DELETE LOCAL SUCCESS:`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJobs(new Set());
      
      toast({
        title: "Success",
        description: `${data.deletedCount} local jobs deleted successfully`,
      });
    },
    onError: (error: any) => {
      console.error(`❌ BULK DELETE LOCAL ERROR:`, error);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Error",
        description: error.message || "Failed to bulk delete local jobs",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (sentToAutocab: boolean) => {
    return sentToAutocab 
      ? "bg-green-100 text-green-800" 
      : "bg-yellow-100 text-yellow-800";
  };

  const getStatusText = (sentToAutocab: boolean) => {
    return sentToAutocab ? "SENT" : "PENDING";
  };

  // Calculate local jobs count (not sent to Autocab)
  const localJobsCount = jobs.filter(job => !job.sentToAutocab && !job.autocabBookingId).length;

  // Selection handlers
  const toggleJobSelection = (jobId: number) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedJobs.size} jobs?`)) {
      console.log(`🗑️ BULK DELETE: Starting bulk delete for ${selectedJobs.size} jobs`);
      
      try {
        // Delete all selected jobs using the mutation
        await Promise.all(Array.from(selectedJobs).map(jobId => deleteJobMutation.mutateAsync(jobId)));
        
        // Clear selection after successful deletion
        setSelectedJobs(new Set());
        
        console.log(`✅ BULK DELETE: Successfully deleted ${selectedJobs.size} jobs`);
      } catch (error) {
        console.error(`❌ BULK DELETE ERROR:`, error);
        // Clear selection even on error to prevent confusion
        setSelectedJobs(new Set());
      }
    }
  };

  const handleBulkSendToAutocab = () => {
    if (selectedJobs.size === 0) return;
    if (confirm(`Send ${selectedJobs.size} jobs to Autocab?`)) {
      sendJobsToAutocabMutation.mutate(Array.from(selectedJobs));
    }
  };

  const handleBulkDeleteLocal = () => {
    if (localJobsCount === 0) {
      toast({
        title: "No Local Jobs",
        description: "No local jobs found to delete. All jobs have been sent to Autocab.",
        variant: "destructive",
      });
      return;
    }
    
    const confirmed = confirm(
      `Delete all ${localJobsCount} local jobs?\n\nThis will delete all jobs that haven't been sent to Autocab yet. Jobs already sent to Autocab will be preserved.`
    );
    
    if (confirmed) {
      console.log(`🗑️ USER CONFIRMED BULK DELETE LOCAL - ${localJobsCount} jobs`);
      bulkDeleteLocalMutation.mutate();
    } else {
      console.log(`❌ USER CANCELLED BULK DELETE LOCAL`);
    }
  };

  const handleRowDoubleClick = (jobId: number) => {
    setLocation(`/bot-advanced/${jobId}`);
  };

  const handleContextMenu = (e: React.MouseEvent, jobId: number) => {
    e.preventDefault();
    setContextMenuJob(jobId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenuJob) return;
    
    console.log(`🔍 CONTEXT MENU ACTION: ${action} for job ${contextMenuJob}`);
    
    switch (action) {
      case 'edit':
        setLocation(`/bot-advanced/${contextMenuJob}`);
        break;
      case 'delete':
        console.log(`🗑️ CONTEXT MENU DELETE - Job ID: ${contextMenuJob}`);
        if (confirm(`Are you sure you want to delete job ${contextMenuJob}?`)) {
          console.log(`🗑️ USER CONFIRMED CONTEXT DELETE - Job ID: ${contextMenuJob}`);
          deleteJobMutation.mutate(contextMenuJob);
        } else {
          console.log(`❌ USER CANCELLED CONTEXT DELETE - Job ID: ${contextMenuJob}`);
        }
        break;
    }
    
    setContextMenuJob(null);
    setContextMenuPosition(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenuJob(null);
      setContextMenuPosition(null);
    };
    
    if (contextMenuPosition) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenuPosition]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Job Dashboard</h3>
            {selectedJobs.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedJobs.size} selected
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkSendToAutocab}
                  disabled={sendJobsToAutocabMutation.isPending}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send to Autocab
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleBulkDelete}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {localJobsCount > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkDeleteLocal}
                disabled={bulkDeleteLocalMutation.isPending}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Local ({localJobsCount})
              </Button>
            )}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <Checkbox
                    checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all jobs"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pax</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Note</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Our Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr 
                  key={job.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${selectedJobs.has(job.id) ? 'bg-blue-50' : ''}`}
                  onDoubleClick={() => handleRowDoubleClick(job.id)}
                  onContextMenu={(e) => handleContextMenu(e, job.id)}
                >
                  <td className="px-4 py-2 whitespace-nowrap w-10">
                    <Checkbox
                      checked={selectedJobs.has(job.id)}
                      onCheckedChange={() => toggleJobSelection(job.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select job ${job.jobNumber}`}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {job.jobNumber}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Badge className={getStatusColor(Boolean(job.sentToAutocab))}>
                      {getStatusText(Boolean(job.sentToAutocab))}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {job.time}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    £{job.price}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    £{job.price}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {job.distance || 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {job.passengers || 5}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 truncate max-w-32">
                    {job.vehicleType === 'Saloon' ? 'Vehicle type: Sal' : 
                     job.vehicleType === 'Estate' ? 'Vehicle type: Est' :
                     job.vehicleType === 'MPV' ? 'Vehicle type: MPV' :
                     job.vehicleType === 'Large MPV' ? 'Vehicle type: Lar' :
                     'Vehicle type: Sal'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    CabCo
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    SGH
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    SGH-SAGA
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 truncate max-w-32">
                    {job.customerName?.split(',')[0] || 'Unknown'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    07{job.id.toString().padStart(3, '0')}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {job.autocabBookingId || job.jobNumber}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(`✏️ SIMPLE EDIT BUTTON CLICKED - Job ID: ${job.id}`);
                          handleRowDoubleClick(job.id);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(`🗑️ SMART DELETE BUTTON CLICKED - Job ID: ${job.id}`);
                          deleteJobMutation.mutate(job.id);
                        }}
                        disabled={deleteJobMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No jobs found</p>
            </div>
          )}
        </div>
        
        {/* Context Menu */}
        {contextMenuPosition && (
          <div
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-32"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
              onClick={() => handleContextMenuAction('edit')}
            >
              <Edit className="h-4 w-4" />
              <span>Edit Job</span>
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2 text-red-600"
              onClick={() => handleContextMenuAction('delete')}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Job</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
