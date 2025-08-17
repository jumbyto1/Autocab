import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import type { Job } from "@/lib/types";

interface CustomerDetailsProps {
  jobData: Partial<Job>;
  setJobData: (data: Partial<Job>) => void;
}

export function CustomerDetails({ jobData, setJobData }: CustomerDetailsProps) {
  const handleInputChange = (field: keyof Job, value: string) => {
    setJobData({ ...jobData, [field]: value });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center">
          <User className="text-blue-600 mr-3 h-5 w-5" />
          <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName">Name</Label>
            <Input
              id="customerName"
              placeholder="Full name"
              value={jobData.customerName || ""}
              onChange={(e) => handleInputChange("customerName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              placeholder="Phone numbers (separated by comma)"
              value={jobData.customerPhone || ""}
              onChange={(e) => handleInputChange("customerPhone", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="customerAccount">Account</Label>
            <Select 
              value={jobData.customerAccount || ""} 
              onValueChange={(value) => handleInputChange("customerAccount", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SGH SAGA">SGH SAGA</SelectItem>
                <SelectItem value="CASH - Cash Payment">CASH - Cash Payment</SelectItem>
                <SelectItem value="CORP - Corporate">CORP - Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="customerReference">Reference</Label>
            <Input
              id="customerReference"
              placeholder="Reference number"
              value={jobData.customerReference || ""}
              onChange={(e) => handleInputChange("customerReference", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
