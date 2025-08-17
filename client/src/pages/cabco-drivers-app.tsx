import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Plus, MapPin, Phone, Mail, User, Car, DollarSign, Star, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CabcoDriver {
  id: number;
  vehicleId: string;
  driverName: string;
  phoneNumber?: string;
  email?: string;
  licenseNumber?: string;
  status: 'online' | 'offline' | 'paused' | 'busy';
  currentLocation?: string;
  lastLocationUpdate?: string;
  totalEarnings: string;
  todayEarnings: string;
  weeklyEarnings: string;
  totalJobs: number;
  todayJobs: number;
  rating: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CabcoDriversApp() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({
    vehicleId: '',
    driverName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
  });

  // Fetch all CABCO drivers
  const { data: drivers, isLoading, error } = useQuery<CabcoDriver[]>({
    queryKey: ['/api/cabco-drivers'],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time status
  });

  // Create new driver mutation
  const createDriverMutation = useMutation({
    mutationFn: (driver: typeof newDriver) => 
      apiRequest('/api/cabco-drivers', { method: 'POST', body: driver }),
    onSuccess: () => {
      toast({
        title: 'Șofer Adăugat',
        description: 'Șoferul CABCO a fost adăugat cu succes în sistem.',
      });
      setIsCreateDialogOpen(false);
      setNewDriver({
        vehicleId: '',
        driverName: '',
        phoneNumber: '',
        email: '',
        licenseNumber: '',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cabco-drivers'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut adăuga șoferul.',
        variant: 'destructive',
      });
    },
  });

  // Update driver status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/cabco-drivers/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cabco-drivers'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'ONLINE';
      case 'busy': return 'OCUPAT';
      case 'paused': return 'PAUZĂ';
      case 'offline': return 'OFFLINE';
      default: return 'NECUNOSCUT';
    }
  };

  const formatLocation = (location?: string) => {
    if (!location) return 'Locație necunoscută';
    try {
      const { lat, lng } = JSON.parse(location);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return 'Locație invalidă';
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'Niciodată';
    return new Date(timestamp).toLocaleString('ro-RO');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Se încarcă șoferii CABCO...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          Eroare la încărcarea șoferilor: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-yellow-600">CABCO DRIVERS APP</h1>
          <p className="text-gray-600">Sistem nativ de management șoferi CABCO</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Șofer CABCO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adaugă Șofer CABCO Nou</DialogTitle>
              <DialogDescription>
                Completează detaliile pentru noul șofer CABCO care va fi integrat direct în sistem.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vehicleId" className="text-right">
                  ID Vehicul
                </Label>
                <Input
                  id="vehicleId"
                  placeholder="e.g., 901"
                  className="col-span-3"
                  value={newDriver.vehicleId}
                  onChange={(e) => setNewDriver({ ...newDriver, vehicleId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="driverName" className="text-right">
                  Nume Șofer
                </Label>
                <Input
                  id="driverName"
                  placeholder="Nume complet"
                  className="col-span-3"
                  value={newDriver.driverName}
                  onChange={(e) => setNewDriver({ ...newDriver, driverName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phoneNumber" className="text-right">
                  Telefon
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder="+44..."
                  className="col-span-3"
                  value={newDriver.phoneNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, phoneNumber: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  placeholder="sofer@cabco.com"
                  className="col-span-3"
                  type="email"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="licenseNumber" className="text-right">
                  Nr. Licență
                </Label>
                <Input
                  id="licenseNumber"
                  placeholder="Numărul licenței"
                  className="col-span-3"
                  value={newDriver.licenseNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Anulează
              </Button>
              <Button 
                onClick={() => createDriverMutation.mutate(newDriver)}
                disabled={createDriverMutation.isPending || !newDriver.vehicleId || !newDriver.driverName}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {createDriverMutation.isPending ? 'Se adaugă...' : 'Adaugă Șofer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Șoferi</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Șoferi Online</CardTitle>
            <Car className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {drivers?.filter(d => d.status === 'online').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Șoferi Ocupați</CardTitle>
            <Car className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {drivers?.filter(d => d.status === 'busy').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Joburi Astăzi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers?.reduce((sum, d) => sum + d.todayJobs, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {drivers?.map((driver) => (
          <Card key={driver.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{driver.driverName}</CardTitle>
                  <p className="text-sm text-gray-500">Vehicul #{driver.vehicleId}</p>
                </div>
                <Badge 
                  className={`${getStatusColor(driver.status)} text-white`}
                >
                  {getStatusText(driver.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                {driver.phoneNumber && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    {driver.phoneNumber}
                  </div>
                )}
                {driver.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    {driver.email}
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                <span className="truncate">{formatLocation(driver.currentLocation)}</span>
              </div>

              {/* Last Update */}
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span>{formatTime(driver.lastLocationUpdate)}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">Astăzi</p>
                  <p className="text-sm font-semibold">£{driver.todayEarnings} ({driver.todayJobs} joburi)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rating</p>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-semibold">{driver.rating}</span>
                  </div>
                </div>
              </div>

              {/* Status Control */}
              <div className="pt-2">
                <Select 
                  value={driver.status} 
                  onValueChange={(status) => updateStatusMutation.mutate({ id: driver.id, status })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Schimbă status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">🟢 ONLINE</SelectItem>
                    <SelectItem value="busy">🔴 OCUPAT</SelectItem>
                    <SelectItem value="paused">🟡 PAUZĂ</SelectItem>
                    <SelectItem value="offline">⚫ OFFLINE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {drivers?.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Niciun șofer CABCO</h3>
            <p className="text-gray-600 mb-4">
              Adaugă primul șofer CABCO pentru a începe sistemul nativ.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Primul Șofer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}