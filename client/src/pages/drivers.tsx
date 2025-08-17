import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DriverMap } from "@/components/bot-advanced/driver-map";
import { VehicleTracker } from "@/components/vehicle-tracker";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Users, 
  Car, 
  Phone, 
  MapPin, 
  Search, 
  RefreshCw,
  User,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface AutocabDriver {
  id: string;
  callsign: string;
  fullName: string;
  mobile: string;
  active: boolean;
  suspended: boolean;
  lastPosition?: {
    latitude: number;
    longitude: number;
    timestamp?: string;
  };
}

export default function DriversPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMapView, setShowMapView] = useState(false);

  // Fetch drivers from Autocab API
  const { data: driversData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/drivers']
  });

  const drivers = (driversData as any)?.drivers || [];
  
  // Filter drivers based on search
  const filteredDrivers = drivers.filter((driver: AutocabDriver) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (driver.callsign || '').toLowerCase().includes(searchLower) ||
      (driver.fullName || '').toLowerCase().includes(searchLower) ||
      (driver.mobile || '').includes(searchTerm)
    );
  });

  const activeDrivers = drivers.filter((d: AutocabDriver) => d.active && !d.suspended);
  const inactiveDrivers = drivers.filter((d: AutocabDriver) => !d.active || d.suspended);

  // Debug driver data structure
  console.log('🔍 Driver data analysis:', {
    totalDrivers: drivers.length,
    sampleDriver: drivers[0] ? {
      callsign: drivers[0].callsign,
      fullName: drivers[0].fullName,
      hasLastPosition: !!drivers[0].lastPosition,
      lastPosition: drivers[0].lastPosition
    } : null,
    driversWithLastPosition: drivers.filter((d: AutocabDriver) => d.lastPosition).length
  });

  // Filter ONLY ONLINE drivers with GPS coordinates for statistics  
  const driversWithPositions = drivers.filter((d: AutocabDriver) => 
    d.active && !d.suspended && // DOAR driverii ONLINE
    d.lastPosition && 
    d.lastPosition.latitude !== 0 && 
    d.lastPosition.longitude !== 0
  );
  
  console.log(`📍 ONLINE drivers with GPS: ${driversWithPositions.length}/${activeDrivers.length} active drivers`);
  


  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Real Autocab Drivers</h1>
            <Badge variant="default" className="bg-green-600 text-white">
              Live from Autocab API
            </Badge>
          </div>
          <p className="text-gray-600">Monitor {drivers.length} CABCO drivers from Autocab system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                  <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeDrivers.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{inactiveDrivers.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With GPS</p>
                  <p className="text-2xl font-bold text-blue-600">{driversWithPositions.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search drivers by callsign, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowMapView(!showMapView)}
              variant={showMapView ? "default" : "outline"}
              className="whitespace-nowrap"
            >
              <Car className="h-4 w-4 mr-2" />
              {showMapView ? "Show List" : "Vehicle Tracker"}
            </Button>
            
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading drivers from Autocab...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Drivers</h3>
              <p className="text-gray-600 mb-4">Could not connect to Autocab API. Please check your connection.</p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : showMapView ? (
          // Map View with Resizable Panels
          <div className="h-[800px] border rounded-lg">
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={75} minSize={40}>
                <Card className="h-full border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Car className="h-5 w-5 mr-2" />
                      Vehicle Tracker
                      {driversWithPositions.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {driversWithPositions.length} vehicles with GPS
                        </Badge>
                      )}

                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-4rem)]">
                    <div className="h-full">
                      <VehicleTracker />
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={25} minSize={15}>
                <Card className="h-full border-0 rounded-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Driver Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 h-[calc(100%-3rem)] overflow-y-auto">
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-600">{activeDrivers.length}</div>
                          <div className="text-xs text-green-600">Active</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-600">{inactiveDrivers.length}</div>
                          <div className="text-xs text-red-600">Inactive</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-bold text-blue-600">{driversWithPositions.length}</div>
                          <div className="text-xs text-blue-600">GPS</div>
                        </div>
                      </div>
                      
                      {driversWithPositions.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-600 mb-2">Drivers with GPS</h4>
                          <div className="space-y-1">
                            {driversWithPositions.slice(0, 8).map((driver: AutocabDriver) => (
                              <div key={driver.id} className="flex items-center justify-between text-xs p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">{driver.callsign}</span>
                                <span className="text-gray-500 truncate ml-2">{driver.fullName}</span>
                              </div>
                            ))}
                            {driversWithPositions.length > 8 && (
                              <div className="text-xs text-gray-400 text-center py-1">
                                +{driversWithPositions.length - 8} more drivers
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : (
          // List View
          <div className="space-y-4">
            {filteredDrivers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? "No drivers found" : "No drivers available"}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? `No drivers match "${searchTerm}". Try a different search term.`
                      : "No drivers are currently registered in the Autocab system."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrivers.map((driver: AutocabDriver) => (
                  <Card key={driver.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{driver.callsign}</h3>
                            <p className="text-sm text-gray-600">{driver.fullName}</p>
                          </div>
                        </div>
                        <Badge variant={driver.active && !driver.suspended ? "default" : "secondary"}>
                          {driver.active && !driver.suspended ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{driver.mobile}</span>
                        </div>

                        {driver.lastPosition && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              {driver.lastPosition.latitude.toFixed(4)}, {driver.lastPosition.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}

                        {driver.lastPosition?.timestamp && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              Last update: {new Date(driver.lastPosition.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {driver.suspended && (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              Suspended
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}