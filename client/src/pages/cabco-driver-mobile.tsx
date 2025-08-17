import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, Navigation, MapPin, Clock, Car, 
  TrendingUp, Settings, LogOut, CircleDot,
  CheckCircle, XCircle, DollarSign, Timer,
  User, AlertTriangle, Smartphone
} from 'lucide-react';
import cabcoLogoPath from '@assets/CABCO-LOGO_1752230053005.webp';

interface DriverSession {
  id: string;
  vehicleId: string;
  driverName: string;
  status: 'online' | 'offline' | 'pause';
  shift: {
    startTime: string;
    endTime?: string;
    totalEarnings: number;
    totalJobs: number;
  };
  location?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
}

interface PendingJob {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  pickup: string;
  destination: string;
  distance: string;
  estimatedPrice: string;
  scheduledTime: string;
  priority: 'normal' | 'high';
  via?: string[];
}

export default function CabcoDriverMobile() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [driverSession, setDriverSession] = useState<DriverSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'jobs' | 'earnings' | 'settings'>('dashboard');

  // Get pending jobs for driver
  const { data: driverJobs = [], isLoading: jobsLoading } = useQuery<PendingJob[]>({
    queryKey: ['/api/driver-jobs', driverSession?.id],
    enabled: !!driverSession?.id,
    refetchInterval: 3000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (vehicleId: string) => 
      apiRequest('/api/driver/login', { method: 'POST', body: { vehicleId } }),
    onSuccess: (data) => {
      const session = data.driver || data; // Handle different response formats
      console.log('🔐 Login response:', data);
      console.log('📋 Session object:', session);
      console.log('📋 Session keys:', Object.keys(session));
      
      setDriverSession(session);
      setIsLoggedIn(true);
      localStorage.setItem('driver_session', JSON.stringify(session));
      startLocationTracking();
      toast({
        title: 'Conectat cu Succes',
        description: `Bine ai venit, ${session.driverName}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Eroare Login',
        description: error.message || 'Nu s-a putut conecta. Verifică ID-ul vehiculului.',
        variant: 'destructive',
      });
    },
  });

  // Status update mutation - SIMPLIFIED DIRECT VERSION
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      console.log('🚀 BUTON APĂSAT! Status:', status);
      
      // Direct fetch pentru test
      const response = await fetch(`/api/driver/900/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Success:', result);
      return result;
    },
    onSuccess: (data) => {
      const newStatus = data.status;
      setDriverSession(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Start/stop location tracking based on status
      console.log('🔄 Status changed to:', newStatus);
      if (newStatus === 'online') {
        console.log('🟢 Starting GPS for online status');
        setTimeout(() => startLocationTracking(), 100); // Small delay to ensure state is updated
      } else {
        console.log('🔴 Stopping GPS for offline/pause status');
        stopLocationTracking();
      }
      
      toast({
        title: 'Status Actualizat',
        description: `Status schimbat în ${getStatusText(newStatus)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Eroare Status',
        description: error.message || 'Nu s-a putut actualiza statusul',
        variant: 'destructive',
      });
    },
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/driver-jobs/${jobId}/accept`, { method: 'POST', body: { driverId: driverSession?.id } }),
    onSuccess: () => {
      toast({
        title: 'Job Acceptat',
        description: 'Ai acceptat jobul. Navighează către client.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/driver-jobs'] });
    },
  });

  // Reject job mutation
  const rejectJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/driver-jobs/${jobId}/reject`, { method: 'POST', body: { driverId: driverSession?.id } }),
    onSuccess: () => {
      toast({
        title: 'Job Respins',
        description: 'Jobul a fost respins.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/driver-jobs'] });
    },
  });

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('driver_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setDriverSession(session);
        setIsLoggedIn(true);
        startLocationTracking();
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('driver_session');
      }
    }
  }, []);

  // Add location tracking ref
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startLocationTracking = () => {
    console.log('📍 Starting GPS tracking...');
    
    // Clear existing interval
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setCurrentLocation(null);
      setIsLocationTracking(false);
      return;
    }
    
    setIsLocationTracking(true);
    
    const updateLocation = () => {
      console.log('📍 Requesting GPS position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('✅ GPS Success:', location);
          setCurrentLocation(location);
          
          // Send location to server
          fetch(`/api/driver/900/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...location, timestamp: new Date().toISOString() })
          }).catch(err => console.warn('Location update failed:', err));
        },
        (error) => {
          console.error('❌ GPS Error:', error);
          // Set a test location for debugging
          const testLocation = { lat: 51.2795, lng: 1.0760 }; // Canterbury coords
          console.log('🧪 Using test location:', testLocation);
          setCurrentLocation(testLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    };

    // Get initial location
    updateLocation();
    // Update every 10 seconds
    locationIntervalRef.current = setInterval(updateLocation, 10000);
  };
  
  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setIsLocationTracking(false);
    setCurrentLocation(null);
    console.log('📍 GPS Stopped');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'pause': return 'Pauză';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'pause': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleId.trim()) {
      loginMutation.mutate(vehicleId.trim());
    }
  };

  const handleStatusChange = (status: string) => {
    console.log('🚀 BUTTON PRESSED! Status change to:', status);
    console.log('📋 Current session:', driverSession);
    
    // Show immediate feedback
    toast({
      title: 'Se actualizează...',
      description: `Schimbare status la ${status}`,
    });
    
    updateStatusMutation.mutate(status);
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const callDispatch = () => {
    window.open('tel:+441227760760'); // CABCO dispatch number
  };

  const navigateToPickup = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
  };

  const handleLogout = () => {
    stopLocationTracking(); // Stop GPS tracking properly
    setIsLoggedIn(false);
    setDriverSession(null);
    localStorage.removeItem('driver_session');
    toast({
      title: 'Deconectat',
      description: 'Ai fost deconectat cu succes.',
    });
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-yellow-400">
              <img src={cabcoLogoPath} alt="CABCO Logo" className="w-16 h-16 object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">CABCO DRIVER</CardTitle>
            <p className="text-gray-600">Canterbury Taxis</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Vehicul
                </label>
                <Input
                  type="text"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  placeholder="ex: 301, 200, 191..."
                  className="text-center text-lg font-semibold"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-yellow-400 font-semibold py-3"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                    Se conectează...
                  </div>
                ) : (
                  'CONECTARE'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-yellow-400 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(driverSession?.status || 'offline')}`}></div>
            <div>
              <h1 className="font-bold text-lg">CABCO DRIVER</h1>
              <p className="text-sm opacity-90">{driverSession?.driverName} • Vehicul {driverSession?.vehicleId}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-yellow-400 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Controls */}
      <div className="p-4 bg-white border-b">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleStatusChange('online')}
            disabled={updateStatusMutation.isPending}
            className={`flex-1 relative ${driverSession?.status === 'online' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            {updateStatusMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CircleDot className="w-4 h-4 mr-1" />
                Online
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => handleStatusChange('pause')}
            disabled={updateStatusMutation.isPending}
            className={`flex-1 relative ${driverSession?.status === 'pause' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            {updateStatusMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Timer className="w-4 h-4 mr-1" />
                Pauză
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => handleStatusChange('offline')}
            disabled={updateStatusMutation.isPending}
            className={`flex-1 relative ${driverSession?.status === 'offline' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            {updateStatusMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1" />
                Offline
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'jobs', label: 'Joburi', icon: Car },
          { id: 'earnings', label: 'Câștiguri', icon: DollarSign },
          { id: 'settings', label: 'Setări', icon: Settings }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveScreen(id as any)}
            className={`flex-1 p-3 text-center ${
              activeScreen === id ? 'text-yellow-500 bg-gray-50' : 'text-gray-600'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="pb-20 p-4">
        {activeScreen === 'dashboard' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">£{driverSession?.shift?.totalEarnings || '0.00'}</div>
                  <div className="text-sm text-gray-600">Azi</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Car className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{driverSession?.shift?.totalJobs || 0}</div>
                  <div className="text-sm text-gray-600">Joburi</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acțiuni Rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={callDispatch}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                  size="lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Sună Dispeceratul
                </Button>
                {driverSession?.status === 'online' && (
                  currentLocation ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg border border-green-200">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span>GPS Activ: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Se obține locația GPS...</span>
                    </div>
                  )
                )}
                {driverSession?.status !== 'online' && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>GPS Oprit - {getStatusText(driverSession?.status || 'offline')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeScreen === 'jobs' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Joburi Disponibile ({driverJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="mt-2 text-gray-600">Se încarcă joburile...</p>
                  </div>
                ) : driverJobs && driverJobs.length > 0 ? (
                  <div className="space-y-3">
                    {driverJobs.map((job) => (
                      <Card key={job.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{job.customerName}</h3>
                              <p className="text-gray-600 text-sm">ID: {job.bookingId}</p>
                            </div>
                            <Badge variant={job.priority === 'high' ? 'destructive' : 'secondary'}>
                              {job.priority === 'high' ? 'URGENT' : 'Normal'}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">Ridicare</p>
                                <p className="text-gray-700 text-sm">{job.pickup}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">Destinație</p>
                                <p className="text-gray-700 text-sm">{job.destination}</p>
                              </div>
                            </div>
                            {job.via && job.via.length > 0 && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">Via</p>
                                  <p className="text-gray-700 text-sm">{job.via.join(', ')}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                            <div>
                              <p className="font-medium">Distanță</p>
                              <p className="text-gray-600">{job.distance}</p>
                            </div>
                            <div>
                              <p className="font-medium">Preț</p>
                              <p className="text-green-600 font-semibold">{job.estimatedPrice}</p>
                            </div>
                            <div>
                              <p className="font-medium">Ora</p>
                              <p className="text-gray-600">{job.scheduledTime}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => acceptJobMutation.mutate(job.id)}
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              disabled={acceptJobMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => rejectJobMutation.mutate(job.id)}
                              variant="outline"
                              className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                              disabled={rejectJobMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Respinge
                            </Button>
                            <Button
                              onClick={() => callCustomer(job.customerPhone)}
                              variant="outline"
                              size="icon"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => navigateToPickup(job.pickup)}
                              variant="outline"
                              size="icon"
                            >
                              <Navigation className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nu există joburi disponibile</p>
                    <p className="text-sm text-gray-500 mt-1">Vei fi notificat când apar joburi noi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeScreen === 'earnings' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Câștiguri Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-green-500 mb-2">
                    £{driverSession?.shift?.totalEarnings || '0.00'}
                  </div>
                  <p className="text-gray-600 mb-4">Câștiguri totale azi</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">Joburi Complete</p>
                      <p className="text-2xl font-bold">{driverSession?.shift?.totalJobs || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">Timp Activ</p>
                      <p className="text-2xl font-bold">
                        {driverSession?.shift?.startTime ? 
                          Math.floor((new Date().getTime() - new Date(driverSession.shift.startTime).getTime()) / (1000 * 60 * 60)) + 'h'
                          : '0h'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeScreen === 'settings' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informații Șofer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nume:</span>
                  <span className="font-medium">{driverSession?.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicul:</span>
                  <span className="font-medium">{driverSession?.vehicleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(driverSession?.status || 'offline')}>
                    {getStatusText(driverSession?.status || 'offline')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={callDispatch}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Dispecerat CABCO
                </Button>
                <div className="text-center text-sm text-gray-600">
                  <p>Pentru probleme tehnice sau urgențe</p>
                  <p className="font-medium">+44 1227 760760</p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Deconectare
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}