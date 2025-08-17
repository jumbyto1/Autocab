import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZoneAutocomplete } from "@/components/ui/zone-autocomplete";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Route, MapPin } from "lucide-react";
import type { Job } from "@/lib/types";

interface TripDetailsProps {
  jobData: Partial<Job>;
  setJobData: (data: Partial<Job>) => void;
}

export function TripDetails({ jobData, setJobData }: TripDetailsProps) {
  const handleInputChange = (field: string, value: string) => {
    setJobData({ ...jobData, [field]: value });
  };



  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center">
          <Route className="text-blue-600 mr-3 h-5 w-5" />
          <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={jobData.date || ""}
              onChange={(e) => handleInputChange("date", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={jobData.time || ""}
              onChange={(e) => handleInputChange("time", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <Label htmlFor="pickup">Pickup</Label>
              <Input
                id="pickup"
                value={jobData.pickup || ""}
                onChange={(e) => handleInputChange("pickup", e.target.value)}
                placeholder="Enter pickup location"
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="pickupNote" className="text-gray-600">Note</Label>
              <Input
                id="pickupNote"
                value={jobData.pickupNote || ""}
                onChange={(e) => handleInputChange("pickupNote", e.target.value)}
                placeholder="Note"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="pickupZone" className="text-blue-600 font-semibold">ZONE</Label>
              <ZoneAutocomplete
                value={jobData.pickupZone || ""}
                onChange={(value) => handleInputChange("pickupZone", value)}
                placeholder="Zone"
                className="bg-blue-50 border-blue-200 font-bold text-blue-700 text-center text-sm"
              />
            </div>
          </div>
          
          {/* Via Points */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <Label htmlFor="via1" className="text-gray-700">Via</Label>
              <Input
                id="via1"
                value={jobData.via1 || ""}
                onChange={(e) => handleInputChange("via1", e.target.value)}
                placeholder="Enter via point"
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="via1Note" className="text-gray-600">Note</Label>
              <Input
                id="via1Note"
                value={jobData.via1Note || ""}
                onChange={(e) => handleInputChange("via1Note", e.target.value)}
                placeholder="Note"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="via1Zone" className="text-blue-600 font-semibold">ZONE</Label>
              <ZoneAutocomplete
                value={jobData.via1Zone || ""}
                onChange={(value) => handleInputChange("via1Zone", value)}
                placeholder="Zone"
                className="bg-blue-50 border-blue-200 font-bold text-blue-700 text-center text-sm"
              />
            </div>
          </div>

          {(jobData.via2 || jobData.via1) && (
            <div>
              <Label htmlFor="via2">Via 2 (Optional)</Label>
              <AddressAutocomplete
                value={jobData.via2 || ""}
                onChange={(value: string) => handleInputChange("via2", value)}
                placeholder="Enter via point 2"
                className="pr-10"
              />
            </div>
          )}

          {(jobData.via3 || jobData.via2) && (
            <div>
              <Label htmlFor="via3">Via 3 (Optional)</Label>
              <AddressAutocomplete
                value={jobData.via3 || ""}
                onChange={(value: string) => handleInputChange("via3", value)}
                placeholder="Enter via point 3"
                className="pr-10"
              />
            </div>
          )}

          {(jobData.via4 || jobData.via3) && (
            <div>
              <Label htmlFor="via4">Via 4 (Optional)</Label>
              <AddressAutocomplete
                value={jobData.via4 || ""}
                onChange={(value: string) => handleInputChange("via4", value)}
                placeholder="Enter via point 4"
                className="pr-10"
              />
            </div>
          )}

          {(jobData.via5 || jobData.via4) && (
            <div>
              <Label htmlFor="via5">Via 5 (Optional)</Label>
              <AddressAutocomplete
                value={jobData.via5 || ""}
                onChange={(value: string) => handleInputChange("via5", value)}
                placeholder="Enter via point 5"
                className="pr-10"
              />
            </div>
          )}

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={jobData.destination || ""}
                onChange={(e) => handleInputChange("destination", e.target.value)}
                placeholder="Enter destination"
                className="w-full"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="destinationNote" className="text-gray-600">Note</Label>
              <Input
                id="destinationNote"
                value={jobData.destinationNote || ""}
                onChange={(e) => handleInputChange("destinationNote", e.target.value)}
                placeholder="Note"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="destinationZone" className="text-blue-600 font-semibold">ZONE</Label>
              <ZoneAutocomplete
                value={jobData.destinationZone || ""}
                onChange={(value) => handleInputChange("destinationZone", value)}
                placeholder="Zone"
                className="bg-blue-50 border-blue-200 font-bold text-blue-700 text-center text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
