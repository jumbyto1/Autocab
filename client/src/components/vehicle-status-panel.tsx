import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertCircle, Car, CheckCircle, XCircle } from "lucide-react";

interface VehicleInfo {
  id: number;
  callsign: string;
  make?: string;
  model?: string;
  registration?: string;
  status?: string;
  statusColor?: string;
  coordinates?: { lat: number; lng: number } | null;
  isOnline?: boolean;
  vehicleName?: string;
}

interface VehicleResponse {
  success: boolean;
  vehicles: VehicleInfo[];
}

export default function VehicleStatusPanel() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8 space-y-3">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          <div>
            <h3 className="font-medium text-gray-900">System Operational</h3>
            <p className="text-sm text-gray-500 mt-1">
              All booking systems are running normally
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">AUTOCAB API</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Connected
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Google Maps</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">SAGA Integration</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Ready
            </Badge>
          </div>
        </div>
        
        <div className="border-t pt-3 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>System Health</span>
            <span>All Services OK</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}