import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, User, Car, Phone, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutocabBooking {
  id: number;
  pickupDueTime: string;
  pickup: {
    address: { text: string };
  };
  destination: {
    address: { text: string };
  };
  name?: string;
  telephoneNumber?: string;
  yourReferences?: {
    yourReference1?: string;
  };
  ourReference?: string;
  bookedBy?: string;
  company?: string;
  driverNote?: string;
  passengers?: number;
  luggage?: number;
  pricing?: {
    cost?: number;
    price?: number;
  };

  vias?: Array<{
    address: { text: string };
  }>;
  driver?: {
    id?: number;
    name?: string;
  };
  vehicle?: {
    id?: number;
    registration?: string;
  };
  requestedDrivers?: number[];
  requestedVehicles?: number[];
  driverConstraints?: {
    requestedDrivers: number[];
    forbiddenDrivers: number[];
  };
  vehicleConstraints?: {
    requestedVehicles: number[];
    forbiddenVehicles: number[];
  };
  // DYNAMIC CONSTRAINT RESOLUTION fields
  resolvedDriverCallsign?: string | null;
  resolvedVehicleCallsign?: string | null;
  // CSV CROSS-REFERENCE SUGGESTIONS fields
  suggestedDriverCallsign?: string | null;
  suggestedDriverName?: string | null;
  suggestedVehicleCallsign?: string | null;
  // SOLUTION ❶: Add assignedDriver field for backend response
  assignedDriver?: {
    id?: string | number;
    name?: string;
    callsign?: string | number;
  };
  suggestionOpacity?: number;
  suggestionSource?: string;
}

interface SearchResponse {
  success: boolean;
  message?: string;
  assignedBookings?: AutocabBooking[];
  unassignedBookings?: AutocabBooking[];
}

export default function GlobalSearch() {
  const [searchParams, setSearchParams] = useState({
    driverId: "",
    vehicleId: "",
    phone: "",
    customerName: "",
    date: new Date().toISOString().substring(0, 10) // YYYY-MM-DD
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    setIsSearching(true);

    try {
      interface SearchParams {
        driverId?: number;
        vehicleId?: number;
        telephoneNumber?: string;
      }

      const params: SearchParams = {};

      if (searchParams.driverId.trim()) {
        const driverIdNum = parseInt(searchParams.driverId.trim());
        if (!isNaN(driverIdNum)) params.driverId = driverIdNum;
      }

      if (searchParams.vehicleId.trim()) {
        const vehicleIdNum = parseInt(searchParams.vehicleId.trim());
        if (!isNaN(vehicleIdNum)) params.vehicleId = vehicleIdNum;
      }

      if (searchParams.phone.trim()) {
        params.telephoneNumber = searchParams.phone.trim();
      }

      const from = new Date(`${searchParams.date}T00:00:00`).toISOString();
      const to = new Date(`${searchParams.date}T23:59:59`).toISOString();

      const searchBody = {
        from,
        to,
        types: ["Active", "Advanced", "Mobile", "Dispatched"],
        exactMatch: false,
        ignorePostcode: true,
        ignoreTown: true,
        ...params,
      };

      const response = await fetch("/api/search-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
      });

      const result = await response.json();

      if (response.ok && result.bookings) {
        // CRITICAL FIX: Classify bookings based on authentic AUTOCAB assignments and resolved constraints
        const assignedBookings = result.bookings.filter((b: AutocabBooking) => {
          // Check for authentic driver/vehicle assignments from AUTOCAB
          const hasDirectAssignment = Boolean(b.driver?.name || b.vehicle?.registration);
          
          // Check for resolved constraint assignments (processed by backend)
          const hasResolvedConstraints = Boolean(b.resolvedDriverCallsign || b.resolvedVehicleCallsign);
          
          // Check for constraint data indicating allocation (even if not yet resolved)
          const hasConstraintData = Boolean(
            b.vehicleConstraints?.requestedVehicles?.length || 
            b.driverConstraints?.requestedDrivers?.length
          );
          
          console.log(`🔍 BOOKING ${b.id} CLASSIFICATION:`, {
            hasDirectAssignment,
            hasResolvedConstraints,  
            hasConstraintData,
            driverName: b.driver?.name,
            vehicleReg: b.vehicle?.registration,
            resolvedDriver: b.resolvedDriverCallsign,
            resolvedVehicle: b.resolvedVehicleCallsign,
            vehicleConstraints: b.vehicleConstraints?.requestedVehicles,
            driverConstraints: b.driverConstraints?.requestedDrivers
          });
          
          return hasDirectAssignment || hasResolvedConstraints || hasConstraintData;
        });

        const unassignedBookings = result.bookings.filter((b: AutocabBooking) =>
          !assignedBookings.includes(b)
        );

        console.log(`📊 GLOBAL SEARCH RESULTS: ${assignedBookings.length} assigned, ${unassignedBookings.length} unassigned out of ${result.bookings.length} total`);

        setSearchData({
          success: true,
          assignedBookings,
          unassignedBookings,
        });

        toast({
          title: "Căutare completă",
          description: `Găsite ${result.bookings.length} booking-uri din AUTOCAB (${assignedBookings.length} alocate, ${unassignedBookings.length} nealocate)`
        });
      } else {
        throw new Error(result.error || result.message || "Căutarea AUTOCAB a eșuat");
      }
    } catch (error) {
      toast({
        title: "Eroare la căutare",
        description: error instanceof Error ? error.message : "Eroare necunoscută",
        variant: "destructive",
      });
      setSearchData({
        success: false,
        message: error instanceof Error ? error.message : "Eroare necunoscută",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto space-y-6 overflow-x-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Search className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">Global Search AUTOCAB</h1>
        </div>

        {/* Search Form Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg text-gray-700">Parametrii de căutare</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 bg-white rounded-b-lg">
            {/* Search Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* ID Șofer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  ID Șofer
                </Label>
                <Input
                  placeholder="426"
                  value={searchParams.driverId}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, driverId: e.target.value }))}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* ID Vehicul */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  ID Vehicul
                </Label>
                <Input
                  placeholder="997"
                  value={searchParams.vehicleId}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, vehicleId: e.target.value }))}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefon
                </Label>
                <Input
                  placeholder="01227..."
                  value={searchParams.phone}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, phone: e.target.value }))}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Nume client */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nume client
                </Label>
                <Input
                  placeholder="John Smith"
                  value={searchParams.customerName}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, customerName: e.target.value }))}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Data
                </Label>
                <Input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Căutare AUTOCAB
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchData && searchData.success && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-white rounded-t-lg border-b border-gray-100 pb-4">
              <CardTitle className="text-lg text-gray-700">
                Rezultate căutare - {(searchData.assignedBookings?.length || 0) + (searchData.unassignedBookings?.length || 0)} booking-uri găsite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto overflow-y-auto max-h-96">
                <table className="min-w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ID</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Ora</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Pickup</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Destination</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Client</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Telefon</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Șofer</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Mașină</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Preț</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...(searchData.assignedBookings || []), ...(searchData.unassignedBookings || [])].map((booking, index) => {
                      const isAssigned = searchData.assignedBookings?.includes(booking);
                      const bookingTime = new Date(booking.pickupDueTime).toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={`booking-${booking.id || index}`} 
                            className={`hover:bg-gray-50 ${isAssigned ? 'bg-orange-25' : 'bg-blue-25'}`}>
                          <td className="px-2 py-2 text-xs font-medium text-blue-600 truncate">
                            #{booking.id}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900">
                            {bookingTime}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 truncate">
                            {booking.pickup?.address?.text || 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 truncate">
                            {booking.destination?.address?.text || 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 truncate">
                            {booking.name || 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 truncate">
                            {booking.telephoneNumber || 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-xs text-blue-600">
                            {/* SOLUTION ❸: Display assignedDriver with User icon */}
                            <div className="flex items-center gap-1">
                              {booking.assignedDriver ? (
                                <>
                                  <User className="h-3 w-3 text-blue-500" />
                                  <span className="font-medium">
                                    {booking.assignedDriver.callsign || booking.assignedDriver.id}
                                  </span>
                                </>
                              ) : booking.resolvedDriverCallsign ? (
                                <>
                                  <User className="h-3 w-3 text-orange-500" />
                                  <span className="text-orange-600">
                                    {booking.resolvedDriverCallsign}
                                  </span>
                                </>
                              ) : booking.driver?.name ? (
                                <>
                                  <User className="h-3 w-3 text-green-500" />
                                  <span>{booking.driver.name}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}

                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-blue-600">
                            {/* AUTHENTIC AUTOCAB DATA: Real vehicle registration or resolved callsign from live fleet data */}
                            <div className="space-y-1">
                              <div>
                                {booking.vehicle?.registration || 
                                 booking.resolvedVehicleCallsign ||
                                 'N/A'}
                              </div>

                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900">
                            £{booking.pricing?.price?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex px-1 py-1 text-xs font-semibold rounded-full ${
                              isAssigned 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isAssigned ? 'Alocat' : 'Nealocat'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results Message */}
        {searchData && (!searchData.assignedBookings?.length && !searchData.unassignedBookings?.length) && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nu s-au găsit rezultate</h3>
              <p className="text-gray-500">Încercați să modificați parametrii de căutare și căutați din nou.</p>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {searchData && !searchData.success && (
          <Card className="shadow-lg border-0 border-red-200">
            <CardContent className="p-6 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Search className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Eroare la căutare</h3>
                  <p className="text-sm text-red-700 mt-1">{searchData.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}