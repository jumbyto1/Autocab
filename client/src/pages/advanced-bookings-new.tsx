import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, Settings, Filter, X, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface GlobalSearchFilters {
  fromDate: string;
  toDate: string;
  pickup: string;
  pickupZone: string;
  destination: string;
  destinationZone: string;
  customerName: string;
  telephoneNumber: string;
  loyaltyCard: string;
  account: string;
  company: string;
  completedByCompany: string;
  bookingId: string;
  officeNote: string;
  driverNote: string;
  ourReference: string;
  yourReference: string;
  capabilities: string;
  bookedBy: string;
  externalBookingRef: string;
  docketNumber: string;
  cabExchangeRef: string;
  email: string;
  passengerInformation: string;
  paymentReference: string;
  bookingSource: string;
  
  // Live Source options
  liveSource: {
    active: boolean;
    advanced: boolean;
    mobile: boolean;
  };
  
  // Historic Source options
  historicSource: {
    cancelled: boolean;
    completed: boolean;
    noFare: boolean;
    recovered: boolean;
    skipped: boolean;
    suspended: boolean;
  };
  
  // Address Options
  exactMatch: boolean;
  ignoreTown: boolean;
  ignorePostcode: boolean;
  subContractedOnly: boolean;
  
  // Driver/Vehicle filters
  driver: string;
  vehicle: string;
  regNumber: string;
  plateNumber: string;
  badgeNumber: string;
}

interface AdvancedBooking {
  bookingId: string;
  yourReference: string;
  pickup: string;
  destination: string;
  pickupTime: string;
  cost: number;
  price: number;
  reqVehicle: string;
  distance: number;
  passengers: number;
  luggage: number;
  driverNote: string;
  ourRef: string;
  bookedBy: string;
  account: string;
  company: string;
  customerName: string;
  via?: string;
  status: string;
  requestedDriver?: string;
  requestedVehicle?: string;
  driver?: { name: string; id: string };
  vehicle?: { registration: string; id: string };
}

interface AdvancedBookingsResponse {
  success: boolean;
  bookings: AdvancedBooking[];
  totalCount: number;
}

export function AdvancedBookingsNew() {
  const [, setLocation] = useLocation();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<GlobalSearchFilters>({
    fromDate: new Date().toISOString().split('T')[0] + ' 00:00',
    toDate: new Date().toISOString().split('T')[0] + ' 23:59',
    pickup: '',
    pickupZone: '',
    destination: '',
    destinationZone: '',
    customerName: '',
    telephoneNumber: '',
    loyaltyCard: '',
    account: '',
    company: '',
    completedByCompany: '',
    bookingId: '',
    officeNote: '',
    driverNote: '',
    ourReference: '',
    yourReference: '',
    capabilities: '',
    bookedBy: '',
    externalBookingRef: '',
    docketNumber: '',
    cabExchangeRef: '',
    email: '',
    passengerInformation: '',
    paymentReference: '',
    bookingSource: '',
    liveSource: {
      active: true,
      advanced: true,
      mobile: true,
    },
    historicSource: {
      cancelled: false,
      completed: false,
      noFare: false,
      recovered: false,
      skipped: false,
      suspended: false,
    },
    exactMatch: false,
    ignoreTown: true,
    ignorePostcode: true,
    subContractedOnly: false,
    driver: '',
    vehicle: '',
    regNumber: '',
    plateNumber: '',
    badgeNumber: '',
  });

  // Fetch bookings using global search filters
  const { data, isLoading, refetch } = useQuery<AdvancedBookingsResponse>({
    queryKey: ['/api/autocab/global-search', globalFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(globalFilters).forEach(([key, value]) => {
        if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        } else if (value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/autocab/global-search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
  });

  const bookings = data?.bookings || [];

  const handleFilterChange = (field: keyof GlobalSearchFilters, value: any) => {
    setGlobalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFilterChange = (category: 'liveSource' | 'historicSource', field: string, value: boolean) => {
    setGlobalFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const clearAllFilters = () => {
    setGlobalFilters({
      fromDate: new Date().toISOString().split('T')[0] + ' 00:00',
      toDate: new Date().toISOString().split('T')[0] + ' 23:59',
      pickup: '',
      pickupZone: '',
      destination: '',
      destinationZone: '',
      customerName: '',
      telephoneNumber: '',
      loyaltyCard: '',
      account: '',
      company: '',
      completedByCompany: '',
      bookingId: '',
      officeNote: '',
      driverNote: '',
      ourReference: '',
      yourReference: '',
      capabilities: '',
      bookedBy: '',
      externalBookingRef: '',
      docketNumber: '',
      cabExchangeRef: '',
      email: '',
      passengerInformation: '',
      paymentReference: '',
      bookingSource: '',
      liveSource: {
        active: true,
        advanced: true,
        mobile: true,
      },
      historicSource: {
        cancelled: false,
        completed: false,
        noFare: false,
        recovered: false,
        skipped: false,
        suspended: false,
      },
      exactMatch: false,
      ignoreTown: true,
      ignorePostcode: true,
      subContractedOnly: false,
      driver: '',
      vehicle: '',
      regNumber: '',
      plateNumber: '',
      badgeNumber: '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-orange-600">Advanced Bookings</h1>
          <Badge variant="outline" className="text-sm">
            {bookings.length} Bookings
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={showGlobalSearch} onOpenChange={setShowGlobalSearch}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Global Search
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Global Search - AUTOCAB Style Filtering
                </DialogTitle>
              </DialogHeader>
              
              {/* Global Search Form */}
              <div className="space-y-6 py-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From</Label>
                    <Input
                      id="fromDate"
                      type="datetime-local"
                      value={globalFilters.fromDate}
                      onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To</Label>
                    <Input
                      id="toDate"
                      type="datetime-local"
                      value={globalFilters.toDate}
                      onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Address Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup</Label>
                    <Input
                      id="pickup"
                      value={globalFilters.pickup}
                      onChange={(e) => handleFilterChange('pickup', e.target.value)}
                      placeholder="Enter pickup address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupZone">Pickup Zone</Label>
                    <Input
                      id="pickupZone"
                      value={globalFilters.pickupZone}
                      onChange={(e) => handleFilterChange('pickupZone', e.target.value)}
                      placeholder="Enter pickup zone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      value={globalFilters.destination}
                      onChange={(e) => handleFilterChange('destination', e.target.value)}
                      placeholder="Enter destination address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destinationZone">Destination Zone</Label>
                    <Input
                      id="destinationZone"
                      value={globalFilters.destinationZone}
                      onChange={(e) => handleFilterChange('destinationZone', e.target.value)}
                      placeholder="Enter destination zone"
                    />
                  </div>
                </div>

                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Name</Label>
                    <Input
                      id="customerName"
                      value={globalFilters.customerName}
                      onChange={(e) => handleFilterChange('customerName', e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephoneNumber">Telephone Number</Label>
                    <Input
                      id="telephoneNumber"
                      value={globalFilters.telephoneNumber}
                      onChange={(e) => handleFilterChange('telephoneNumber', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Business Information */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Account</Label>
                    <Input
                      id="account"
                      value={globalFilters.account}
                      onChange={(e) => handleFilterChange('account', e.target.value)}
                      placeholder="Enter account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={globalFilters.company}
                      onChange={(e) => handleFilterChange('company', e.target.value)}
                      placeholder="Enter company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bookingId">Booking ID</Label>
                    <Input
                      id="bookingId"
                      value={globalFilters.bookingId}
                      onChange={(e) => handleFilterChange('bookingId', e.target.value)}
                      placeholder="Enter booking ID"
                    />
                  </div>
                </div>

                {/* Live Source Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Live Source</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="active"
                        checked={globalFilters.liveSource.active}
                        onCheckedChange={(checked) => handleNestedFilterChange('liveSource', 'active', !!checked)}
                      />
                      <Label htmlFor="active" className="text-sm">F1 Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="advanced"
                        checked={globalFilters.liveSource.advanced}
                        onCheckedChange={(checked) => handleNestedFilterChange('liveSource', 'advanced', !!checked)}
                      />
                      <Label htmlFor="advanced" className="text-sm">F2 Advanced</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mobile"
                        checked={globalFilters.liveSource.mobile}
                        onCheckedChange={(checked) => handleNestedFilterChange('liveSource', 'mobile', !!checked)}
                      />
                      <Label htmlFor="mobile" className="text-sm">F3 Mobile</Label>
                    </div>
                  </div>
                </div>

                {/* Historic Source Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Historic Source</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cancelled"
                        checked={globalFilters.historicSource.cancelled}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'cancelled', !!checked)}
                      />
                      <Label htmlFor="cancelled" className="text-sm">F4 Cancelled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="completed"
                        checked={globalFilters.historicSource.completed}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'completed', !!checked)}
                      />
                      <Label htmlFor="completed" className="text-sm">F5 Completed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="noFare"
                        checked={globalFilters.historicSource.noFare}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'noFare', !!checked)}
                      />
                      <Label htmlFor="noFare" className="text-sm">F7 No Fare</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recovered"
                        checked={globalFilters.historicSource.recovered}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'recovered', !!checked)}
                      />
                      <Label htmlFor="recovered" className="text-sm">F8 Recovered</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skipped"
                        checked={globalFilters.historicSource.skipped}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'skipped', !!checked)}
                      />
                      <Label htmlFor="skipped" className="text-sm">F9 Skipped</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="suspended"
                        checked={globalFilters.historicSource.suspended}
                        onCheckedChange={(checked) => handleNestedFilterChange('historicSource', 'suspended', !!checked)}
                      />
                      <Label htmlFor="suspended" className="text-sm">F10 Suspended</Label>
                    </div>
                  </div>
                </div>

                {/* Address Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Address Options</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exactMatch"
                        checked={globalFilters.exactMatch}
                        onCheckedChange={(checked) => handleFilterChange('exactMatch', !!checked)}
                      />
                      <Label htmlFor="exactMatch" className="text-sm">Exact Match (Shift+F1)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ignoreTown"
                        checked={globalFilters.ignoreTown}
                        onCheckedChange={(checked) => handleFilterChange('ignoreTown', !!checked)}
                      />
                      <Label htmlFor="ignoreTown" className="text-sm">Ignore Town (Shift+F2)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ignorePostcode"
                        checked={globalFilters.ignorePostcode}
                        onCheckedChange={(checked) => handleFilterChange('ignorePostcode', !!checked)}
                      />
                      <Label htmlFor="ignorePostcode" className="text-sm">Ignore Postcode (Shift+F3)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="subContractedOnly"
                        checked={globalFilters.subContractedOnly}
                        onCheckedChange={(checked) => handleFilterChange('subContractedOnly', !!checked)}
                      />
                      <Label htmlFor="subContractedOnly" className="text-sm">Sub-Contracted Only (Shift+F4)</Label>
                    </div>
                  </div>
                </div>

                {/* Driver/Vehicle Filters */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver">Driver</Label>
                    <Input
                      id="driver"
                      value={globalFilters.driver}
                      onChange={(e) => handleFilterChange('driver', e.target.value)}
                      placeholder="Enter driver ID/name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Vehicle</Label>
                    <Input
                      id="vehicle"
                      value={globalFilters.vehicle}
                      onChange={(e) => handleFilterChange('vehicle', e.target.value)}
                      placeholder="Enter vehicle ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regNumber">Reg Number</Label>
                    <Input
                      id="regNumber"
                      value={globalFilters.regNumber}
                      onChange={(e) => handleFilterChange('regNumber', e.target.value)}
                      placeholder="Enter registration"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowGlobalSearch(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      refetch();
                      setShowGlobalSearch(false);
                    }}>
                      <Search className="h-4 w-4 mr-2" />
                      Search Bookings
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading bookings...</span>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              <Badge variant="secondary">{bookings.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bookings found matching your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Booking ID</th>
                      <th className="text-left p-2">Your Reference</th>
                      <th className="text-left p-2">Pickup</th>
                      <th className="text-left p-2">Destination</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Price</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Driver</th>
                      <th className="text-left p-2">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.bookingId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{booking.bookingId}</td>
                        <td className="p-2">{booking.yourReference}</td>
                        <td className="p-2 max-w-xs truncate">{booking.pickup}</td>
                        <td className="p-2 max-w-xs truncate">{booking.destination}</td>
                        <td className="p-2 text-xs">{new Date(booking.pickupTime).toLocaleString()}</td>
                        <td className="p-2">£{booking.price?.toFixed(2) || '0.00'}</td>
                        <td className="p-2">{booking.customerName}</td>
                        <td className="p-2">
                          <Badge variant={booking.status === 'Active' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="p-2">{booking.driver?.name || '-'}</td>
                        <td className="p-2">{booking.vehicle?.registration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}