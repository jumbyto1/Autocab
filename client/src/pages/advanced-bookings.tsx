import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, Settings, ChevronLeft, ChevronRight, RefreshCw, ChevronUp, ChevronDown, Filter, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  status: 'Active' | 'Completed' | 'Cancelled';
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

export function AdvancedBookings() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBookingRange, setCurrentBookingRange] = useState({ min: 360000, max: 390000 });
  const [filterMode, setFilterMode] = useState<'default' | 'dispatched' | 'custom'>('default');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [customStatuses, setCustomStatuses] = useState({
    Active: false,
    Advanced: false,
    Mobile: false,
    Dispatched: false,
    Completed: false,
    Cancelled: false,
    Recovered: false,
    NoJob: false,
    Skipped: false,
    Suspended: false,
    ExchangedActive: false,
    ExchangedMobile: false,
    ExchangedCompleted: false,
    ExchangedCancelled: false,
    ExchangedNoJob: false
  });
  
  // localStorage keys for persistent state
  const STORAGE_KEYS = {
    visibleColumns: 'advancedBookings_visibleColumns',
    columnWidths: 'advancedBookings_columnWidths',
    sortConfig: 'advancedBookings_sortConfig'
  };

  // Load state from localStorage or use defaults
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // Save state to localStorage
  const saveToStorage = <T,>(key: string, value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  };

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => 
    loadFromStorage(STORAGE_KEYS.visibleColumns, {
      bookingId: true,
      yourReference: true,
      pickup: true,
      via: true,
      destination: true,
      pickupTime: true,
      cost: true,
      price: true,
      reqVehicle: true,
      distance: true,
      passengers: true,
      luggage: true,
      driverNote: true,
      ourRef: true,
      bookedBy: true,
      account: true,
      company: true,
      customerName: true,
      requestedDriver: true,
      requestedVehicle: true,
      assignedDriver: true,
      assignedVehicle: true
    })
  );

  // Sorting state with localStorage persistence
  const [sortConfig, setSortConfig] = useState<{
    field: keyof AdvancedBooking | null;
    direction: 'asc' | 'desc';
  }>(() => 
    loadFromStorage(STORAGE_KEYS.sortConfig, { field: null, direction: 'asc' })
  );

  // Column widths state with localStorage persistence (resizable columns)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    loadFromStorage(STORAGE_KEYS.columnWidths, {
      bookingId: 120,
      yourReference: 140,
      pickup: 200,
      via: 150,
      destination: 200,
      pickupTime: 120,
      cost: 80,
      price: 80,
      reqVehicle: 100,
      distance: 80,
      passengers: 80,
      luggage: 80,
      driverNote: 150,
      ourRef: 100,
      bookedBy: 120,
      account: 100,
      company: 120,
      customerName: 150,
      requestedDriver: 140,
      requestedVehicle: 140,
      assignedDriver: 140,
      assignedVehicle: 140
    })
  );

  // Effect to save states to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.visibleColumns, visibleColumns);
  }, [visibleColumns]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.columnWidths, columnWidths);
  }, [columnWidths]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sortConfig, sortConfig);
  }, [sortConfig]);

  // Sorting functions
  const handleSort = (field: keyof AdvancedBooking) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortBookings = (bookings: AdvancedBooking[]) => {
    if (!sortConfig.field) return bookings;

    return [...bookings].sort((a, b) => {
      const aValue = a[sortConfig.field!];
      const bValue = b[sortConfig.field!];
      
      // Handle undefined/null values
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      // Handle numeric fields (price, cost, distance, passengers, luggage)
      const numericFields = ['price', 'cost', 'distance', 'passengers', 'luggage'];
      if (numericFields.includes(sortConfig.field!)) {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        
        if (sortConfig.direction === 'asc') {
          return aNum - bNum;
        } else {
          return bNum - aNum;
        }
      }
      
      // Handle text fields
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  };



  // Get current month/year for booking range management
  const getCurrentMonthRange = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Base range starts at 360000 for July 2025
    const baseMonth = 6; // July (0-indexed)
    const baseYear = 2025;
    
    const monthsDifference = (currentYear - baseYear) * 12 + (currentMonth - baseMonth);
    const rangeIncrement = monthsDifference * 50000;
    
    return {
      min: 360000 + rangeIncrement,
      max: 390000 + rangeIncrement
    };
  };

  // Update booking range when component mounts
  useEffect(() => {
    const monthRange = getCurrentMonthRange();
    setCurrentBookingRange(monthRange);
  }, []);

  // Auto-switch filter mode based on selected date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!isToday && filterMode === 'default') {
      // Switch to dispatched mode for historical dates (shows Completed, Cancelled, etc.)
      setFilterMode('dispatched');
    } else if (isToday && filterMode === 'dispatched') {
      // Switch back to default mode for today (shows Active, Advanced, Mobile)
      setFilterMode('default');
    }
  }, [selectedDate, filterMode]);

  // Force cache invalidation state for manual refresh
  const [refreshTimestamp, setRefreshTimestamp] = useState(0);
  
  // Fetch bookings from Autocab API - Auto-load on mount + manual refresh
  const { data: bookingsData, isLoading, error, refetch } = useQuery<AdvancedBookingsResponse>({
    queryKey: ['/api/autocab/advanced-bookings', selectedDate, filterMode, customStatuses, refreshTimestamp],
    enabled: true, // Enable automatic fetch on mount and dependency changes
    retry: 3,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
    queryFn: () => {
      const params = new URLSearchParams({
        date: selectedDate,
        searchQuery: searchQuery || '',
        filterMode: filterMode,
        customStatuses: JSON.stringify(customStatuses),
        t: Date.now().toString() // Force fresh data
      });
      return fetch(`/api/autocab/advanced-bookings?${params}`)
        .then(res => res.json());
    }
  });

  // Filter bookings by search query
  const filteredBookings = (bookingsData?.bookings || []).filter(booking => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return booking.bookingId.toLowerCase().includes(query) ||
           booking.yourReference?.toLowerCase().includes(query) ||
           booking.pickup?.toLowerCase().includes(query) ||
           booking.destination?.toLowerCase().includes(query) ||
           booking.customerName?.toLowerCase().includes(query);
  });

  // Apply sorting to filtered bookings
  const sortedBookings = sortBookings(filteredBookings);
  const totalCount = bookingsData?.totalCount || 0;

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { 
    field: keyof AdvancedBooking; 
    children: React.ReactNode; 
    className?: string; 
  }) => {
    const isActive = sortConfig.field === field;
    const direction = sortConfig.direction;

    return (
      <th 
        className={`px-3 py-2 text-left text-xs font-medium text-gray-700 border-r cursor-pointer hover:bg-gray-300 select-none relative group ${className}`}
        onClick={() => handleSort(field)}
        style={{ width: columnWidths[field] || 'auto' }}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{children}</span>
          <div className="flex items-center ml-1">
            {isActive ? (
              direction === 'asc' ? (
                <ChevronUp className="w-3 h-3 text-blue-600" />
              ) : (
                <ChevronDown className="w-3 h-3 text-blue-600" />
              )
            ) : (
              <div className="w-3 h-3 opacity-0 group-hover:opacity-50">
                <ChevronUp className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
        {/* Resize handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = columnWidths[field] || 120;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX);
              handleColumnResize(field, newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      </th>
    );
  };

  // Handle double-click to edit booking
  const handleBookingDoubleClick = (booking: AdvancedBooking) => {
    // Navigate to Bot Advanced with booking ID
    setLocation(`/bot-advanced?bookingId=${booking.bookingId}`);
  };

  // Auto-assign drivers to pending bookings
  const handleAutoAssignDrivers = async () => {
    try {
      console.log('🎯 AUTO-ASSIGN DRIVERS: Starting assignment process...');
      
      // Find bookings that need driver assignment (Advanced status)
      const pendingBookings = sortedBookings.filter(booking => 
        booking.status === 'Advanced' && 
        (!booking.assignedDriver || !booking.assignedVehicle)
      );
      
      console.log(`🎯 FOUND ${pendingBookings.length} BOOKINGS NEEDING ASSIGNMENT`);
      
      if (pendingBookings.length === 0) {
        alert('No bookings found that need driver assignment.');
        return;
      }
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each booking for assignment
      for (const booking of pendingBookings) {
        try {
          const response = await fetch(`/api/assign-driver/${booking.bookingId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ ASSIGNED: Booking ${booking.bookingId} → Driver ${result.assignment.driverId} (Vehicle ${result.assignment.vehicleId})`);
            successCount++;
          } else {
            console.error(`❌ FAILED: Assignment for booking ${booking.bookingId}`);
            failureCount++;
          }
        } catch (error) {
          console.error(`❌ ERROR: Assignment for booking ${booking.bookingId}:`, error);
          failureCount++;
        }
      }
      
      // Refresh data to show assignments
      refetch();
      
      // Show results
      alert(`Auto-Assignment Complete:\n✅ Success: ${successCount}\n❌ Failed: ${failureCount}`);
      
    } catch (error) {
      console.error('❌ Auto-assignment error:', error);
      alert('Error during auto-assignment process. Please try again.');
    }
  };

  // Handle next/previous month for booking range
  const handlePreviousMonth = () => {
    setCurrentBookingRange(prev => ({
      min: prev.min - 50000,
      max: prev.max - 50000
    }));
  };

  const handleNextMonth = () => {
    setCurrentBookingRange(prev => ({
      min: prev.min + 50000,
      max: prev.max + 50000
    }));
  };

  // Get month name from booking range
  const getMonthFromRange = (range: { min: number; max: number }) => {
    const baseRange = 360000;
    const monthsDiff = Math.floor((range.min - baseRange) / 50000);
    const date = new Date(2025, 6 + monthsDiff); // July 2025 as base
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Toggle column visibility
  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Handle column resizing
  const handleColumnResize = (field: keyof AdvancedBooking | string, newWidth: number) => {
    // No limits - user can resize freely
    setColumnWidths(prev => ({
      ...prev,
      [field]: newWidth
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 rounded-full p-1">
            <Calendar className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-semibold">Advanced Bookings</h1>
        </div>
        <div className="text-sm font-medium">
          {totalCount} Bookings
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Date and Search */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {/* Booking Range Controls and Refresh */}
          <div className="flex items-center gap-4">
            {/* Manual Refresh Button */}
            <Button 
              onClick={() => {
                // Force fresh data fetch by invalidating cache
                setRefreshTimestamp(Date.now());
                refetch();
              }} 
              variant="default" 
              size="sm"
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Manual Refresh'}
            </Button>
            
            <div className="flex items-center gap-2">
              <Button onClick={handlePreviousMonth} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium px-3 py-1 bg-blue-100 rounded">
                {getMonthFromRange(currentBookingRange)}
              </div>
              <Button onClick={handleNextMonth} variant="outline" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Mode Buttons */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setFilterMode('default')}
                  variant={filterMode === 'default' ? "default" : "outline"}
                  size="sm"
                  className={filterMode === 'default' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                >
                  Live Jobs
                </Button>
                <Button
                  onClick={() => setFilterMode('dispatched')}
                  variant={filterMode === 'dispatched' ? "default" : "outline"}
                  size="sm"
                  className={filterMode === 'dispatched' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                >
                  Dispatched
                </Button>
                <Button
                  onClick={() => setFilterMode('assignments')}
                  variant={filterMode === 'assignments' ? "default" : "outline"}
                  size="sm"
                  className={filterMode === 'assignments' ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
                >
                  With Assignments
                </Button>
                <Button
                  onClick={handleAutoAssignDrivers}
                  variant="outline"
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                  disabled={isLoading || !sortedBookings.length}
                >
                  🎯 Auto-Assign Drivers
                </Button>
                <Button
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  variant={showMoreFilters ? "default" : "outline"}
                  size="sm"
                  className={showMoreFilters ? 'bg-gray-500 hover:bg-gray-600 text-white' : ''}
                >
                  More Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* More Filters Panel */}
      {showMoreFilters && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-gray-600">Status Filters:</span>
            
            {/* Live Statuses */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-blue-600">Live:</span>
              {['Active', 'Advanced', 'Mobile', 'Dispatched'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={status}
                    checked={customStatuses[status as keyof typeof customStatuses]}
                    onCheckedChange={(newChecked) => {
                      setCustomStatuses(prev => ({
                        ...prev,
                        [status]: !!newChecked
                      }));
                      setFilterMode('custom');
                    }}
                  />
                  <label htmlFor={status} className="text-sm text-blue-700">{status}</label>
                </div>
              ))}
            </div>

            {/* Completed/Cancelled Statuses */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-green-600">Completed:</span>
              {['Completed', 'Cancelled', 'Recovered'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={status}
                    checked={customStatuses[status as keyof typeof customStatuses]}
                    onCheckedChange={(newChecked) => {
                      setCustomStatuses(prev => ({
                        ...prev,
                        [status]: !!newChecked
                      }));
                      setFilterMode('custom');
                    }}
                  />
                  <label htmlFor={status} className="text-sm text-green-700">{status}</label>
                </div>
              ))}
            </div>

            {/* Other Statuses */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-gray-600">Other:</span>
              {['NoJob', 'Skipped', 'Suspended', 'ExchangedActive', 'ExchangedMobile', 'ExchangedCompleted', 'ExchangedCancelled', 'ExchangedNoJob'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={status}
                    checked={customStatuses[status as keyof typeof customStatuses]}
                    onCheckedChange={(newChecked) => {
                      setCustomStatuses(prev => ({
                        ...prev,
                        [status]: !!newChecked
                      }));
                      setFilterMode('custom');
                    }}
                  />
                  <label htmlFor={status} className="text-sm text-gray-700">{status}</label>
                </div>
              ))}
            </div>

            {/* Clear All Custom Filters */}
            <Button
              onClick={() => {
                setCustomStatuses({
                  Active: false,
                  Advanced: false,
                  Mobile: false,
                  Dispatched: false,
                  Completed: false,
                  Cancelled: false,
                  Recovered: false,
                  NoJob: false,
                  Skipped: false,
                  Suspended: false,
                  ExchangedActive: false,
                  ExchangedMobile: false,
                  ExchangedCompleted: false,
                  ExchangedCancelled: false,
                  ExchangedNoJob: false
                });
                setFilterMode('default');
              }}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Column Settings */}
      <div className="bg-gray-100 border-b px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">Columns:</span>
          {Object.entries(visibleColumns).map(([key, visible]) => (
            <Button
              key={key}
              onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
              variant={visible ? "default" : "outline"}
              size="sm"
              className="h-6 text-xs"
            >
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <div className="text-gray-600">Loading bookings...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 text-lg font-semibold mb-2">
                Failed to Load Bookings
              </div>
              <div className="text-gray-600 mb-4">
                Error connecting to Autocab API
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  {visibleColumns.bookingId && (
                    <SortableHeader field="bookingId">Booking ID</SortableHeader>
                  )}
                  {visibleColumns.yourReference && (
                    <SortableHeader field="yourReference">Your Reference</SortableHeader>
                  )}
                  {visibleColumns.pickup && (
                    <SortableHeader field="pickup">Pickup</SortableHeader>
                  )}
                  {visibleColumns.via && (
                    <SortableHeader field="via">Via</SortableHeader>
                  )}
                  {visibleColumns.destination && (
                    <SortableHeader field="destination">Destination</SortableHeader>
                  )}
                  {visibleColumns.pickupTime && (
                    <SortableHeader field="pickupTime">Pickup Time</SortableHeader>
                  )}
                  {visibleColumns.cost && (
                    <SortableHeader field="cost">Cost</SortableHeader>
                  )}
                  {visibleColumns.price && (
                    <SortableHeader field="price">Price</SortableHeader>
                  )}
                  {visibleColumns.reqVehicle && (
                    <SortableHeader field="reqVehicle">Req Vehicle</SortableHeader>
                  )}
                  {visibleColumns.distance && (
                    <SortableHeader field="distance">Distance</SortableHeader>
                  )}
                  {visibleColumns.passengers && (
                    <SortableHeader field="passengers">Caps</SortableHeader>
                  )}
                  {visibleColumns.luggage && (
                    <SortableHeader field="luggage">Luggage</SortableHeader>
                  )}
                  {visibleColumns.driverNote && (
                    <SortableHeader field="driverNote">Driver Note</SortableHeader>
                  )}
                  {visibleColumns.ourRef && (
                    <SortableHeader field="ourRef">Our Ref</SortableHeader>
                  )}
                  {visibleColumns.bookedBy && (
                    <SortableHeader field="bookedBy">Booked By</SortableHeader>
                  )}
                  {visibleColumns.account && (
                    <SortableHeader field="account">Account Code</SortableHeader>
                  )}
                  {visibleColumns.company && (
                    <SortableHeader field="company">Company</SortableHeader>
                  )}
                  {visibleColumns.customerName && (
                    <SortableHeader field="customerName">Name</SortableHeader>
                  )}
                  {visibleColumns.requestedDriver && (
                    <SortableHeader field="requestedDriver">Req Driver</SortableHeader>
                  )}
                  {visibleColumns.requestedVehicle && (
                    <SortableHeader field="requestedVehicle">Req Vehicle Callsign</SortableHeader>
                  )}
                  {visibleColumns.assignedDriver && (
                    <SortableHeader field="assignedDriver">Assigned Driver</SortableHeader>
                  )}
                  {visibleColumns.assignedVehicle && (
                    <SortableHeader field="assignedVehicle">Assigned Vehicle</SortableHeader>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map((booking, index) => (
                  <tr
                    key={booking.bookingId}
                    className={`
                      border-b cursor-pointer hover:bg-blue-50 transition-colors
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    `}
                    onDoubleClick={() => handleBookingDoubleClick(booking)}
                  >
                    {visibleColumns.bookingId && (
                      <td className="px-3 py-2 text-sm border-r">
                        <span className="font-medium text-blue-600">
                          {booking.bookingId}
                        </span>
                      </td>
                    )}
                    {visibleColumns.yourReference && (
                      <td className="px-3 py-2 text-sm border-r">
                        {typeof booking.yourReference === 'string' ? booking.yourReference : (booking.yourReference?.toString() || '')}
                      </td>
                    )}
                    {visibleColumns.pickup && (
                      <td className="px-3 py-2 text-sm border-r max-w-32 truncate">
                        {typeof booking.pickup === 'string' ? booking.pickup : (booking.pickup?.address || booking.pickup?.text || '')}
                      </td>
                    )}
                    {visibleColumns.via && (
                      <td className="px-3 py-2 text-sm border-r max-w-24 truncate">
                        {typeof booking.via === 'string' ? (booking.via || '-') : (Array.isArray(booking.via) ? booking.via.map(v => v?.address || v?.text || v).join(', ') : '-')}
                      </td>
                    )}
                    {visibleColumns.destination && (
                      <td className="px-3 py-2 text-sm border-r max-w-32 truncate">
                        {typeof booking.destination === 'string' ? booking.destination : (booking.destination?.address || booking.destination?.text || '')}
                      </td>
                    )}
                    {visibleColumns.pickupTime && (
                      <td className="px-3 py-2 text-sm border-r">
                        {new Date(booking.pickupTime).toLocaleTimeString('en-GB', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                    )}
                    {visibleColumns.cost && (
                      <td className="px-3 py-2 text-sm border-r font-medium">
                        £{booking.cost.toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.price && (
                      <td className="px-3 py-2 text-sm border-r font-medium">
                        £{booking.price.toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.reqVehicle && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.reqVehicle}
                      </td>
                    )}
                    {visibleColumns.distance && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.distance.toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.passengers && (
                      <td className="px-3 py-2 text-sm border-r text-center">
                        {booking.passengers}
                      </td>
                    )}
                    {visibleColumns.luggage && (
                      <td className="px-3 py-2 text-sm border-r text-center">
                        {booking.luggage}
                      </td>
                    )}
                    {visibleColumns.driverNote && (
                      <td className="px-3 py-2 text-sm border-r max-w-32 truncate">
                        {typeof booking.driverNote === 'string' ? booking.driverNote : (booking.driverNote?.text || '')}
                      </td>
                    )}
                    {visibleColumns.ourRef && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.ourRef}
                      </td>
                    )}
                    {visibleColumns.bookedBy && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.bookedBy}
                      </td>
                    )}
                    {visibleColumns.account && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.account}
                      </td>
                    )}
                    {visibleColumns.company && (
                      <td className="px-3 py-2 text-sm border-r">
                        {booking.company}
                      </td>
                    )}
                    {visibleColumns.customerName && (
                      <td className="px-3 py-2 text-sm">
                        {booking.customerName}
                      </td>
                    )}
                    {visibleColumns.requestedDriver && (
                      <td className="px-3 py-2 text-sm">
                        {booking.requestedDriver || '-'}
                      </td>
                    )}
                    {visibleColumns.requestedVehicle && (
                      <td className="px-3 py-2 text-sm">
                        {booking.requestedVehicle && booking.requestedVehicle !== '439' && booking.requestedVehicle !== 'undefined' ? booking.requestedVehicle : '-'}
                      </td>
                    )}
                    {visibleColumns.assignedDriver && (
                      <td className="px-3 py-2 text-sm">
                        {booking.assignedDriver && booking.assignedDriver !== 'undefined' && booking.assignedDriver !== '' ? (
                          <span className="text-xs font-medium text-green-600">
                            {booking.assignedDriver}
                          </span>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoAssignDrivers();
                            }}
                            className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                            title="Click to auto-assign driver"
                          >
                            🎯 Assign
                          </button>
                        )}
                      </td>
                    )}
                    {visibleColumns.assignedVehicle && (
                      <td className="px-3 py-2 text-sm">
                        {booking.assignedVehicle && booking.assignedVehicle !== 'undefined' && booking.assignedVehicle !== '' ? (
                          <span className="text-xs font-medium text-blue-600">
                            Vehicle {booking.assignedVehicle}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Awaiting driver
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedBookings.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">No bookings found</div>
                <div className="text-gray-400 text-sm mb-4">
                  Try adjusting your date range or search criteria
                </div>
                <div className="text-orange-600 text-sm font-medium bg-orange-50 p-3 rounded-lg inline-block">
                  📋 LIVE BOOKINGS - VIEW ONLY
                  <div className="text-xs text-orange-500 mt-1">
                    Double-click booking to edit in Bot Advanced
                  </div>
                </div>
              </div>
            )}

            {/* Information Banner */}
            {sortedBookings.length > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 m-4">
                <div className="flex">
                  <div className="text-orange-700">
                    <div className="font-medium">📋 LIVE AUTOCAB BOOKINGS - VIEW ONLY</div>
                    <div className="text-sm mt-1">
                      These are live bookings from Autocab. Double-click any booking to edit in Bot Advanced.
                      <br />Use the Refresh button to see newly added bookings.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancedBookings;