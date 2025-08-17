import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList } from "lucide-react";
import type { Job } from "@/lib/types";

interface BookingDetailsProps {
  jobData: Partial<Job>;
  setJobData: (data: Partial<Job>) => void;
}

export function BookingDetails({ jobData, setJobData }: BookingDetailsProps) {
  const handleInputChange = (field: keyof Job, value: string | number) => {
    setJobData({ ...jobData, [field]: value });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center">
          <ClipboardList className="text-blue-600 mr-3 h-5 w-5" />
          <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="passengers">Passengers</Label>
            <Select 
              value={jobData.passengers?.toString() || "1"} 
              onValueChange={(value) => handleInputChange("passengers", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="luggage">Luggage</Label>
            <Select 
              value={jobData.luggage?.toString() || "0"} 
              onValueChange={(value) => handleInputChange("luggage", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Input
              id="vehicleType"
              placeholder="Enter vehicle type"
              value={jobData.vehicleType || ""}
              onChange={(e) => handleInputChange("vehicleType", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="price">Job Price (£)</Label>
            <div className="flex gap-2">
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={jobData.price?.replace(/[£$,]/g, '') || ""}
                onChange={(e) => handleInputChange("price", `£${e.target.value}`)}
                className="flex-1"
              />
              <button
                type="button"
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded border hover:bg-blue-200"
                title="Lock price to prevent auto-extraction override"
                onClick={() => {
                  // Toggle price lock functionality
                  const isLocked = jobData.priceLocked || false;
                  handleInputChange("priceLocked" as keyof typeof jobData, !isLocked);
                }}
              >
                {jobData.priceLocked ? "🔒" : "🔓"}
              </button>
            </div>
            {jobData.priceLocked && (
              <p className="text-xs text-blue-600 mt-1">Price locked - manual override active</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mobilityAids">Mobility Aids</Label>
            <Input
              id="mobilityAids"
              placeholder="e.g. wheelchair salon"
              value={jobData.mobilityAids || ""}
              onChange={(e) => handleInputChange("mobilityAids", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="capabilities">Capabilities</Label>
            <Input
              id="capabilities"
              placeholder="e.g. W, E, P"
              value={jobData.capabilities || ""}
              onChange={(e) => handleInputChange("capabilities", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="driverNotes">Driver Notes</Label>
          <Textarea
            id="driverNotes"
            rows={3}
            placeholder="Additional notes for the driver"
            value={jobData.driverNotes || ""}
            onChange={(e) => handleInputChange("driverNotes", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
