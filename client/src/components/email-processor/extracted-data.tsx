import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useJobs } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedJobData } from "@/lib/types";

interface ExtractedDataProps {
  extractedData: ExtractedJobData | null;
}

export function ExtractedData({ extractedData }: ExtractedDataProps) {
  const [, setLocation] = useLocation();
  const { createJob } = useJobs();
  const { toast } = useToast();

  const handleCreateJob = async () => {
    if (!extractedData) {
      toast({
        title: "Error",
        description: "No extracted data available",
        variant: "destructive",
      });
      return;
    }

    try {
      const jobData = {
        jobNumber: extractedData.jobNumber || `JOB${Date.now()}`,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        time: extractedData.time || "09:00",
        pickup: extractedData.pickup || "",
        destination: extractedData.destination || "",
        customerName: extractedData.customerName || "",
        customerPhone: extractedData.customerPhone || "",
        customerAccount: "SOH - Saga",
        customerReference: extractedData.customerReference || "",
        passengers: extractedData.passengers || 1,
        luggage: extractedData.luggage || 0,
        vehicleType: extractedData.vehicleType || "Saloon",
        mobilityAids: extractedData.mobilityAids || "",
        capabilities: "",
        price: extractedData.price || "0.00",
        driverNotes: "",
        status: "pending",
      };

      await createJob(jobData);
      
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-3">
        Extracted Information
      </Label>
      
      {!extractedData ? (
        <div className="text-center py-12 text-gray-500">
          <p>No data extracted yet</p>
          <p className="text-sm">Use "Auto Extract" to process email content</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trip Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Trip Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{extractedData.date || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span>{extractedData.time || "Not found"}</span>
              </div>
              <div className="text-gray-600">Pickup:</div>
              <div className="text-xs bg-white p-2 rounded">
                {extractedData.pickup || "Not found"}
              </div>
              <div className="text-gray-600">Destination:</div>
              <div className="text-xs bg-white p-2 rounded">
                {extractedData.destination || "Not found"}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span>{extractedData.customerName || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{extractedData.customerPhone || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span>{extractedData.customerReference || "Not found"}</span>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle:</span>
                <span>{extractedData.vehicleType || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passengers:</span>
                <span>{extractedData.passengers || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Luggage:</span>
                <span>{extractedData.luggage || "Not found"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span>{extractedData.price ? `£${extractedData.price}` : "Not found"}</span>
              </div>
              {extractedData.mobilityAids && (
                <>
                  <div className="text-gray-600">Special Requirements:</div>
                  <div className="text-xs bg-white p-2 rounded">
                    {extractedData.mobilityAids}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="mt-6 flex space-x-3">
          <Button onClick={handleCreateJob} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
          <Button variant="outline" onClick={() => setLocation("/bot-advanced")}>
            <Edit className="mr-2 h-4 w-4" />
            Edit & Process
          </Button>
        </div>
      )}
    </div>
  );
}
