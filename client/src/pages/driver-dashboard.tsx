import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Phone, Clock, Star, DollarSign, Navigation } from "lucide-react";

interface DriverSession {
  driverId: string;
  vehicleId: string;
  driverName: string;
  status: string;
  earnings: {
    today: number;
    shift: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords: {
    latitude: number;
    longitude: number;
  };
  dropoffCoords: {
    latitude: number;
    longitude: number;
  };
  estimatedFare: number;
  distance: number;
  duration: number;
  customerNotes?: string;
  createdAt: Date;
}

interface CurrentRide {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  estimatedFare: string;
  customerNotes?: string;
}

export default function DriverDashboard() {
  const [driverSession, setDriverSession] = useState<DriverSession | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>('301'); // Default for testing
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Driver Authentication
  const loginMutation = useMutation({
    mutationFn: async ({ vehicleId, pin }: { vehicleId: string; pin?: string }) => {
      const response = await apiRequest("/api/driver/login", { method: "POST", body: { vehicleId, pin } });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setDriverSession(data.driver);
        setIsOnline(true);
        toast({
          title: "Login Successful",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    },
  });

  // Get pending ride requests
  const { data: pendingRides = [] } = useQuery<RideRequest[]>({
    queryKey: ["/api/driver/jobs", vehicleId],
    queryFn: async () => {
      const response = await fetch(`/api/driver/${vehicleId}/jobs`);
      const data = await response.json();
      return data.success ? data.jobs : [];
    },
    enabled: !!driverSession && isOnline,
    refetchInterval: 3000, // Check every 3 seconds
  });

  // Get current active ride
  const { data: currentRide } = useQuery<CurrentRide | null>({
    queryKey: ["/api/rides/current", vehicleId],
    queryFn: async () => {
      const response = await fetch(`/api/rides/current?vehicleId=${vehicleId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!driverSession && isOnline,
    refetchInterval: 2000, // Check every 2 seconds
  });

  // Accept ride mutation
  const acceptRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const response = await apiRequest(`/api/rides/${rideId}/accept`, { method: "POST" });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ride Accepted",
        description: "You have successfully accepted the ride request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/jobs"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not accept the ride. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update ride status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ rideId, status }: { rideId: string; status: string }) => {
      const response = await apiRequest(`/api/rides/${rideId}/status`, { method: "POST", body: { status } });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides/current"] });
    },
  });

  // Complete ride mutation
  const completeRideMutation = useMutation({
    mutationFn: async ({ rideId, actualFare }: { rideId: string; actualFare: string }) => {
      const response = await apiRequest(`/api/rides/${rideId}/complete`, { method: "POST", body: { actualFare } });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ride Completed",
        description: "The ride has been successfully completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/current"] });
    },
  });

  // Auto-login on mount
  useEffect(() => {
    if (!driverSession) {
      loginMutation.mutate({ vehicleId });
    }
  }, [vehicleId, driverSession, loginMutation]);

  const handleStatusToggle = (checked: boolean) => {
    setIsOnline(checked);
    if (checked) {
      toast({
        title: "You're Online",
        description: "You can now receive ride requests.",
      });
    } else {
      toast({
        title: "You're Offline",
        description: "You won't receive new ride requests.",
      });
    }
  };

  const openMapsNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  if (!driverSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Driver Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Vehicle ID</label>
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter your vehicle ID"
              />
            </div>
            <Button 
              onClick={() => loginMutation.mutate({ vehicleId })}
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there's an active ride, show ride tracking
  if (currentRide) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Ride</span>
              <Badge variant="default">{currentRide.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-gray-600 mb-1">Customer</h3>
                <p className="font-medium">{currentRide.customerName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{currentRide.customerPhone}</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-600 mb-1">Fare</h3>
                <p className="text-xl font-bold text-green-600">£{currentRide.estimatedFare}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Pickup</h4>
                  <p className="text-sm text-green-700">{currentRide.pickupLocation}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => openMapsNavigation(currentRide.pickupLocation)}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Navigate
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">Destination</h4>
                  <p className="text-sm text-red-700">{currentRide.dropoffLocation}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => openMapsNavigation(currentRide.dropoffLocation)}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Navigate
                  </Button>
                </div>
              </div>
            </div>

            {currentRide.customerNotes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Customer Notes</h4>
                <p className="text-sm text-blue-700">{currentRide.customerNotes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ rideId: currentRide.id, status: "arrived" })}
                disabled={updateStatusMutation.isPending}
              >
                Mark Arrived
              </Button>
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ rideId: currentRide.id, status: "picked_up" })}
                disabled={updateStatusMutation.isPending}
              >
                Picked Up
              </Button>
              <Button
                onClick={() => completeRideMutation.mutate({ 
                  rideId: currentRide.id, 
                  actualFare: currentRide.estimatedFare 
                })}
                disabled={completeRideMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Ride
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Driver Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">{driverSession.vehicleId}</span>
              </div>
              <div>
                <h2 className="font-bold">{driverSession.driverName}</h2>
                <p className="text-sm text-gray-600">Vehicle {driverSession.vehicleId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-medium">4.8</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Available for rides</span>
            <Switch
              checked={isOnline}
              onCheckedChange={handleStatusToggle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold">£{driverSession.earnings.today.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Today</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold">£{driverSession.earnings.shift.toFixed(2)}</p>
              <p className="text-sm text-gray-600">This Shift</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Ride Requests */}
      {pendingRides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Ride Requests ({pendingRides.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRides.map((ride) => (
              <div key={ride.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{ride.customerName}</h3>
                    <p className="text-sm text-gray-600">{ride.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">£{ride.estimatedFare.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{ride.distance}mi • {ride.duration}min</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup</p>
                      <p className="text-sm text-gray-600">{ride.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Destination</p>
                      <p className="text-sm text-gray-600">{ride.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                {ride.customerNotes && (
                  <div className="p-2 bg-blue-50 rounded text-sm">
                    <strong>Notes:</strong> {ride.customerNotes}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {/* Handle decline */}}
                  >
                    Decline
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => acceptRideMutation.mutate(ride.id)}
                    disabled={acceptRideMutation.isPending}
                  >
                    Accept Ride
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Pending Rides */}
      {isOnline && pendingRides.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium text-gray-900 mb-2">Waiting for rides...</h3>
            <p className="text-gray-600">You're online and ready to receive ride requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}