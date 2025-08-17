import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Calendar, RefreshCw, Filter, X, MapPin, Clock, User, Car } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Types for the booking search
interface BookingSearchParams {
  from?: string;
  to?: string;
  telephoneNumber?: string;
  driverId?: number;
  capabilityMatchType?: 'Any' | 'All';
  exactMatch?: boolean;
  ignorePostcode?: boolean;
  ignoreTown?: boolean;
  types?: string[];
  continuationToken?: string;
}

interface BookingAddress {
  zone?: {
    id: number;
    name: string;
    descriptor: string;
    mdtZoneId: number;
  };
  source: string;
  id: number;
  text: string;
  zoneId: number;
  coordinate: {
    latitude: number;
    longitude: number;
    isEmpty: boolean;
  };
  note: string;
  house: string;
  street: string;
  town: string;
  postCode: string;
  bookingPriority: number;
}

interface BookingLocation {
  address: BookingAddress;
  note: string;
  type: string;
  passengerDetailsIndex?: number;
}

interface BookingPricing {
  fare: number;
  cost: number;
  price: number;
  pricingTariff: string;
  isManual: boolean;
  isLocked: boolean;
  waitingTime: number;
  waitingTimeFree: number;
  waitingTimeChargeable: number;
  startTariff: string;
  finishTariff: string;
  gratuityAmount: number;
  waitingTimeCost: number;
  waitingTimePrice: number;
  loyaltyCardCost: number;
  extraCost: number;
  paymentFee: number;
  bookingFee: number;
  cashAccountFee: number;
  kickbackFeeCommission: number;
  driverCommissionFee: number;
  serviceChargeFee: number;
  costSource: string;
  distanceSource: string;
  accountAmount: number;
  cardAmount: number;
  cashAmount: number;
  paymentTransactions: any[];
  meterDistance: {
    asKilometres: number;
    asMetres: number;
    asMiles: number;
    asLocalUnits: number;
    isZero: boolean;
    units: string;
  };
  gpsMeterDistance: number;
  gpsMeterPrice: number;
  gratuitySettingType: string;
  gratuitySettingValue: number;
  bookingCost?: number;
  bookingPrice?: number;
}

interface Booking {
  id: number;
  rowVersion: number;
  bookingType: string;
  returnBookingType: string;
  counterpartID?: number;
  companyId: number;
  pickupDueTime: string;
  pickupDueTimeUtc: string;
  pickupDueTimeMode: string;
  dropOffTime?: string;
  dropOffTimeUtc?: string;
  returnTime?: string;
  passengerTimeZone: number;
  bookedAtTime: string;
  expectedPickupDueTime?: string;
  validFromPickupDueTime?: string;
  validToPickupDueTime?: string;
  bookedById: number;
  modifiedById?: number;
  pickup: BookingLocation;
  vias: BookingLocation[];
  destination: BookingLocation;
  name: string;
  telephoneNumber: string;
  bookerName: string;
  bookerTelephoneNumber: string;
  greeterName: string;
  greeterTelephoneNumber: string;
  passengerInformation: string;
  driverNote: string;
  passengers: number;
  yourReferences: {
    yourReference1: string;
    yourReference2: string;
    yourReference3: string;
    yourReference4: string;
    yourReference5: string;
    yourReference6: string;
    yourReference7: string;
    yourReference8: string;
  };
  ourReference: string;
  priority: number;
  priorityOverride: boolean;
  prioritySource: string;
  pricing: BookingPricing;
  customerId?: number;
  customerDisplayName?: string;
  hasSpecialAccount: boolean;
  flight?: any;
  customerEmail: string;
  capabilities: any[];
  officeNote: string;
  luggage: number;
  driverConstraints: {
    requestedDrivers: any[];
    forbiddenDrivers: any[];
  };
  vehicleConstraints: {
    requestedVehicles: any[];
    forbiddenVehicles: any[];
  };
  paymentMethod: string;
  paymentType: string;
  repeatSchedule: {
    hasRepeats: boolean;
    isFortnightly: boolean;
    repeatDays: string[];
    skippedDays: string[];
    endTime?: string;
    endTimeUtc?: string;
    bookingSuspensionGroupId: number;
  };
  loyaltyCardId?: number;
  distance: number;
  distanceSource: string;
  docketNumber: number;
  paymentTransactionReference: string;
  payByLinkDetails: any[];
  isEasyPay: boolean;
  callID?: number;
  extraPassengerDetails: any[];
  stageInfo: any[];
  rejectedVehicles: any[];
  bookingSource: string;
  releaseCode: string;
  hold: boolean;
  canBeExchanged: boolean;
  wasExchanged: boolean;
  cabExchangeBooking: boolean;
  cabExchange?: any;
  autoApproveInfo?: any;
  questionsAndAnswers: any[];
  travelProgram: string;
  corporateAccountTransactionId?: number;
  corporateAccountDetails?: any;
  waitAndReturn: boolean;
  outOfAreaDeadMileage: {
    amount: number;
    type: string;
  };
  areaCharges: {
    totalPrice: number;
    totalCost: number;
    totalNonCommissionableCost: number;
  };
  igoVendorVat: number;
  igoVendorServiceCharge: number;
  igoVendorServiceChargeVat: number;
  igoAgentCommission: number;
  igoAgentCommissionVat: number;
  externalBookingReference: string;
  distanceFromRouteCalc: boolean;
  bookingSuspensions: any[];
  autoComplete: boolean;
  returnFlight?: any;
  dispatchDueTime: string;
  dispatchDueTimeOverride?: string;
  dispatchDueTimeOverrideUtc?: string;
  activeBooking?: {
    holdType?: string;
    status: string;
    estimatedPickupTime: string;
    calledBackUser: string;
    callStatus: string;
    calledBackAt: string;
    isLate: boolean;
    lastLateTimeHit: number;
    canBeDispatchedToAnotherCompany: boolean;
  };
}

interface BookingSearchResponse {
  continuationToken?: string;
  bookings: Booking[];
}

// Booking types available for search
const BOOKING_TYPES = [
  'Active',
  'Advanced',
  'Mobile',
  'Dispatched',
  'Completed',
  'Cancelled',
  'Recovered',
  'NoJob',
  'Skipped',
  'Suspended',
  'ExchangedActive',
  'ExchangedMobile',
  'ExchangedCompleted',
  'ExchangedCancelled',
  'ExchangedNoJob'
];

// Optimized functions outside component to prevent re-rendering
const getStatusBadgeColor = (bookingType: string) => {
  switch (bookingType) {
    case 'Active':
    case 'Advanced':
    case 'Mobile':
    case 'Dispatched':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Cancelled':
    case 'NoJob':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDateTime = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  } catch {
    return dateString;
  }
};

// Generate default selected types from BOOKING_TYPES
const generateDefaultSelectedTypes = () => {
  const defaultTypes = ['Active', 'Advanced', 'Mobile', 'Dispatched', 'Completed', 'Cancelled'];
  return Object.fromEntries(
    BOOKING_TYPES.map(type => [type, defaultTypes.includes(type)])
  );
};

export function SearchBookings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search form state
  const [searchParams, setSearchParams] = useState<BookingSearchParams>({
    from: new Date(new Date().toDateString()).toISOString(),
    to: new Date(new Date().toDateString() + ' 23:59:59').toISOString(),
    telephoneNumber: '',
    driverId: undefined,
    capabilityMatchType: 'Any',
    exactMatch: false,
    ignorePostcode: true,
    ignoreTown: true,
    types: ['Active', 'Advanced', 'Mobile', 'Dispatched', 'Completed', 'Cancelled']
  });
  
  const [selectedTypes, setSelectedTypes] = useState<{ [key: string]: boolean }>(
    generateDefaultSelectedTypes()
  );

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [continuationToken, setContinuationToken] = useState<string | undefined>();

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (params: BookingSearchParams) => {
      const response = await fetch('/api/search-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      if (!Array.isArray(data.bookings)) {
        throw new Error("Invalid response format - bookings data missing");
      }
      return data as BookingSearchResponse;
    },
    onSuccess: (data) => {
      setSearchResults(data.bookings);
      setContinuationToken(data.continuationToken);
      toast({
        title: "Search Complete",
        description: `Found ${data.bookings.length} bookings`,
      });
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Load more results with continuation token
  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      if (!continuationToken) return { bookings: [] };
      
      // Save last used search params to prevent inconsistency
      const lastUsedParams = { ...searchParams, continuationToken };
      const response = await fetch('/api/search-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastUsedParams)
      });
      
      if (!response.ok) {
        throw new Error('Load more failed');
      }
      
      const data = await response.json();
      if (!Array.isArray(data.bookings)) {
        throw new Error("Invalid response format - bookings data missing");
      }
      return data as BookingSearchResponse;
    },
    onSuccess: (data) => {
      setSearchResults(prev => [...prev, ...data.bookings]);
      setContinuationToken(data.continuationToken);
    }
  });

  const handleSearch = () => {
    const types = Object.entries(selectedTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);
    
    const params = {
      ...searchParams,
      types,
      continuationToken: undefined // Reset continuation token for new search
    };
    
    setContinuationToken(undefined);
    searchMutation.mutate(params);
  };

  const handleTypeToggle = (type: string, checked: boolean) => {
    setSelectedTypes(prev => ({ ...prev, [type]: checked }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Search Bookings</h1>
          <p className="text-gray-600 mt-1">Search for bookings across all types and statuses using Autocab API</p>
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="flex items-center space-x-2"
        >
          {searchMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Search Bookings</span>
        </Button>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="datetime-local"
                value={searchParams.from?.replace('Z', '')}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  from: e.target.value + 'Z' 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="datetime-local"
                value={searchParams.to?.replace('.999Z', '').replace('Z', '')}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  to: e.target.value + '.999Z' 
                }))}
              />
            </div>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={searchParams.telephoneNumber}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  telephoneNumber: e.target.value 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-id">Driver ID</Label>
              <Input
                id="driver-id"
                type="number"
                placeholder="Enter driver ID"
                value={searchParams.driverId || ''}
                onChange={(e) => setSearchParams(prev => ({ 
                  ...prev, 
                  driverId: (() => {
                    const parsed = parseInt(e.target.value, 10);
                    return isNaN(parsed) ? undefined : parsed;
                  })() 
                }))}
              />
            </div>
          </div>

          {/* Booking Types */}
          <div className="space-y-3">
            <Label>Booking Types</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {BOOKING_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={selectedTypes[type]}
                    onCheckedChange={(checked) => handleTypeToggle(type, !!checked)}
                  />
                  <Label htmlFor={type} className="text-sm font-normal">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <Separator />
          <Button
            variant="ghost"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Advanced Filters</span>
            {showAdvancedFilters ? (
              <X className="h-4 w-4" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
          </Button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Capability Match Type</Label>
                  <Select
                    value={searchParams.capabilityMatchType}
                    onValueChange={(value: 'Any' | 'All') => 
                      setSearchParams(prev => ({ ...prev, capabilityMatchType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Any">Any</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="exact-match"
                    checked={searchParams.exactMatch}
                    onCheckedChange={(checked) => 
                      setSearchParams(prev => ({ ...prev, exactMatch: !!checked }))
                    }
                  />
                  <Label htmlFor="exact-match">Exact Match</Label>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ignore-postcode"
                      checked={searchParams.ignorePostcode}
                      onCheckedChange={(checked) => 
                        setSearchParams(prev => ({ ...prev, ignorePostcode: !!checked }))
                      }
                    />
                    <Label htmlFor="ignore-postcode">Ignore Postcode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ignore-town"
                      checked={searchParams.ignoreTown}
                      onCheckedChange={(checked) => 
                        setSearchParams(prev => ({ ...prev, ignoreTown: !!checked }))
                      }
                    />
                    <Label htmlFor="ignore-town">Ignore Town</Label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search Results ({searchResults.length} bookings)</span>
              </CardTitle>
              {continuationToken && (
                <Button
                  variant="outline"
                  onClick={() => loadMoreMutation.mutate()}
                  disabled={loadMoreMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  {loadMoreMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>Load More</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((booking) => (
                <div
                  key={booking.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeColor(booking.bookingType)}
                      >
                        {booking.bookingType}
                      </Badge>
                      <span className="font-medium">#{booking.id}</span>
                      {booking.ourReference && (
                        <span className="text-gray-600 text-sm">
                          Ref: {booking.ourReference}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(booking.pickupDueTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-1" />
                        <div>
                          <div className="font-medium text-sm">Pickup</div>
                          <div className="text-gray-600 text-sm">
                            {booking.pickup?.address?.text ?? 'Address not available'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-red-600 mt-1" />
                        <div>
                          <div className="font-medium text-sm">Destination</div>
                          <div className="text-gray-600 text-sm">
                            {booking.destination?.address?.text ?? 'Address not available'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {booking.telephoneNumber && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{booking.telephoneNumber}</span>
                        </div>
                      )}
                      {booking.name && (
                        <div className="text-sm text-gray-600">
                          Passenger: {booking.name}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Price: £{booking.pricing?.price?.toFixed(2) ?? 'N/A'}</span>
                        <span>Distance: {typeof booking.distance === 'number' ? booking.distance.toFixed(1) : 'N/A'} miles</span>
                        {booking.passengers > 0 && (
                          <span>Passengers: {booking.passengers}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.driverNote && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Driver Note:</strong> {booking.driverNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {searchMutation.isSuccess && searchResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No bookings found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria and search again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

