import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { Job } from "@/lib/types";

interface TripInformationProps {
  jobData: Partial<Job>;
}

export function TripInformation({ jobData }: TripInformationProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center">
          <Info className="text-blue-600 mr-3 h-5 w-5" />
          <h4 className="font-semibold text-gray-900">Trip Information</h4>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Distance:</span>
          <span className="text-sm font-medium text-gray-900">
            {jobData.distance || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Duration:</span>
          <span className="text-sm font-medium text-gray-900">
            {jobData.duration || "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Estimated price:</span>
          <span className="text-sm font-medium text-gray-900">
            {jobData.price ? `£${jobData.price}` : "N/A"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600">Waypoints:</span>
          <span className="text-sm font-medium text-gray-900">
            {jobData.waypoints || 0}
          </span>
        </div>

        {/* Route summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Route Summary</h5>
          <p className="text-xs text-gray-600">
            {jobData.pickup && jobData.destination 
              ? `${jobData.pickup.split(',')[0]} → ${jobData.destination.split(',')[0]}`
              : "Route not defined"
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Fastest route avoiding traffic
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
