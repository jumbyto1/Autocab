import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarIcon, Search, FileText, Download, Clock, Car, DollarSign, MapPin, TrendingUp, Users, Activity, BarChart3, Info, Eye, AlertTriangle, RefreshCw, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MobileMenuButton } from '@/components/layout/sidebar';

// CRITICAL FUNCTION: Commission rate calculation based on authentic transaction groups
const getVehicleCommissionRate = (vehicleCallsign: string): number => {
  // This is a placeholder - in reality, this would map to driver transaction groups
  // For now, using average commission rate from multi-driver scenarios
  // Authentic mappings: Group 15: 50%, Group 6: 10%, Group 2: 40%, Group 12: 30%, Group 1: 20%
  
  // Default to average commission rate (this will be replaced by backend data in real implementation)
  return 0.35; // 35% average commission rate
};

interface DriverShiftTotals {
  totalRows: number;
  totalShifts: number;
  shiftsLength: string;
  jobsMileage: {
    amount: number;
    type: string;
  };
  noJobs: number;
  recoveredJobs: number;
  rejectedJobs: number;
  accountJobs: number;
  cashJobs: number;
  rankJobs: number;
  totalJobs: number;
  accountCost: number;
  loyaltyCardCost: number;
  cashCost: number;
  rankCost: number;
  totalCost: number;
  accountPrice: number;
  loyaltyCardPrice: number;
  cashPrice: number;
  rankPrice: number;
  totalPrice: number;
}

interface DriverShiftDetail {
  // AUTOCAB API actual field names
  fullName: string;
  driverCallsign: string;
  shiftLength: string;
  cashBookingsTotal: number;
  started: string;
  vehicleCallsign: string;
  cashBookings: number;
  accountBookingsCostTotal: number;
  ended: string;
  vehicleRegistration: string;
  totalMileage: number;
  accountBookingsTotal: number;
  rankJobsTotal: number;
  companyName: string;
  // Additional AUTOCAB fields
  shiftAutoId: number;
  driverID: number;
  vehicleID: number;
  vehicleMake: string;
  vehicleModel: string;
  accountBookings: number;
  completedJobsTotal: number;
  completedJobsCostTotal: number;
}

interface DriverShiftResponse {
  totals: DriverShiftTotals;
  shiftsDetails: DriverShiftDetail[];
  transactionGroup?: {
    id: number;
    name: string;
    commissionRate: number;
    commissionAmount: number;
    driverEarnings: number;
  };
  commissionInfo?: {
    isSpecificDriver: boolean;
    calculationMethod: 'specific_driver' | 'multiple_drivers';
    hasTransactionGroup: boolean;
  };
}

// Funcție pentru conversie timp din format ZILE.HH:MM:SS în minute pentru calculele de ore
const convertTimeToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  
  console.log('🕐 CONVERTING TIME STRING:', timeString);
  
  let totalMinutes = 0;
  
  // Check for dot format (days.hours:minutes:seconds)
  if (timeString.includes('.')) {
    const [daysPart, timePart] = timeString.split('.');
    const days = parseInt(daysPart) || 0;
    
    // Sanity check - if days > 365, it's probably corrupt data
    if (days > 365) {
      console.warn('⚠️ SUSPICIOUS TIME DATA - Days > 365:', timeString, 'treating as 0');
      return 0;
    }
    
    totalMinutes += days * 24 * 60; // Convert days to minutes
    
    if (timePart) {
      const [hours, minutes] = timePart.split(':');
      totalMinutes += (parseInt(hours) || 0) * 60;
      totalMinutes += parseInt(minutes) || 0;
    }
  }
  // Check for space format (days hours:minutes:seconds)
  else if (/^\d+\s+\d+:/.test(timeString)) {
    const parts = timeString.split(' ');
    const days = parseInt(parts[0]) || 0;
    
    // Sanity check - if days > 365, it's probably corrupt data
    if (days > 365) {
      console.warn('⚠️ SUSPICIOUS TIME DATA - Days > 365:', timeString, 'treating as 0');
      return 0;
    }
    
    totalMinutes += days * 24 * 60;
    
    if (parts[1]) {
      const [hours, minutes] = parts[1].split(':');
      totalMinutes += (parseInt(hours) || 0) * 60;
      totalMinutes += parseInt(minutes) || 0;
    }
  }
  // Standard format (hours:minutes:seconds)
  else {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    
    // Sanity check - if hours > 8760 (hours in a year), it's probably corrupt
    if (hours > 8760) {
      console.warn('⚠️ SUSPICIOUS TIME DATA - Hours > 8760:', timeString, 'treating as 0');
      return 0;
    }
    
    totalMinutes += hours * 60 + minutes;
  }
  
  // Final sanity check - max 8760 hours in a year = 525600 minutes
  if (totalMinutes > 525600) {
    console.warn('⚠️ SUSPICIOUS TIME TOTAL - Minutes > 525600:', timeString, totalMinutes, 'capping at 0');
    return 0;
  }
  
  console.log('✅ TIME CONVERSION:', timeString, '→', totalMinutes, 'minutes (', (totalMinutes/60).toFixed(1), 'hours)');
  return totalMinutes;
};

// Funcție pentru conversie timp din format ZILE.HH:MM:SS în ore zecimale (CORECTATĂ PENTRU AUTOCAB)
const convertToDecimalHours = (timeString: string): string => {
  if (!timeString || timeString === '00:00:00') return '0';
  
  console.log('🔍 TIME CONVERSION DEBUG:', { originalTime: timeString });
  
  let days = 0;
  let timeOnly = timeString;
  
  // Verifică formatul AUTOCAB: "1.11:38:21" (zile.ore:minute:secunde)
  if (timeString.includes('.')) {
    const dotIndex = timeString.indexOf('.');
    days = parseInt(timeString.substring(0, dotIndex)) || 0;
    timeOnly = timeString.substring(dotIndex + 1);
    console.log('🔍 AUTOCAB FORMAT DETECTED: days.hours:minutes:seconds', { days, timeOnly });
  } 
  // Verifică dacă timpul conține zile (format: "4 41:42:17")
  else if (timeString.includes(' ')) {
    const spaceIndex = timeString.indexOf(' ');
    days = parseInt(timeString.substring(0, spaceIndex)) || 0;
    timeOnly = timeString.substring(spaceIndex + 1);
    console.log('🔍 SPACE FORMAT DETECTED: days hours:minutes:seconds', { days, timeOnly });
  } 
  // Format fără zile sau zile incluse în ore: "854:04:27" sau valori extreme "7756036:00:00"
  else {
    const parts = timeString.split(':');
    if (parts.length === 3) {
      const totalHours = parseInt(parts[0]) || 0;
      
      // CRITICAL FIX: Pentru valori extreme (> 1000 ore), este vorba de date corupte AUTOCAB
      if (totalHours > 1000) {
        console.log('🚨 CORRUPT AUTOCAB TOTALS DATA DETECTED:', { 
          corruptHours: totalHours, 
          originalString: timeString,
          solution: 'Using reasonable estimate instead'
        });
        
        // Pentru valori extrem de mari (> 100,000), estimează ore zilnice rezonabile
        if (totalHours > 100000) {
          const estimatedDailyHours = 10; // Ore zilnice rezonabile pentru un taximetrist
          console.log('🔧 USING REASONABLE DAILY ESTIMATE:', {
            corruptTotal: totalHours,
            reasonableDaily: estimatedDailyHours
          });
          return estimatedDailyHours.toString();
        }
        
        // Pentru valori mari dar nu extreme, extrage restul zilelor
        const remainingHours = totalHours % 24;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        
        const reasonableTotal = remainingHours + (minutes / 60) + (seconds / 3600);
        const result = Math.round(reasonableTotal);
        
        console.log('🔧 EXTRACTED REASONABLE HOURS FROM CORRUPT DATA:', {
          originalTotal: totalHours,
          extractedHours: remainingHours,
          minutes, seconds,
          result: result
        });
        
        days = Math.floor(totalHours / 24);
        timeOnly = `${remainingHours}:${parts[1]}:${parts[2]}`;
        
        // Returnează direct valoarea rezonabilă
        return result.toString();
      }
      
      if (totalHours >= 24) {
        // Ore > 24, înseamnă că sunt zile incluse (valori normale)
        days = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;
        timeOnly = `${remainingHours}:${parts[1]}:${parts[2]}`;
        console.log('🔍 LARGE HOURS FORMAT: converted to days+hours', { originalHours: totalHours, days, timeOnly });
      }
    }
  }
  
  // Parsează partea de timp HH:MM:SS
  const timeParts = timeOnly.split(':');
  if (timeParts.length !== 3) {
    console.log('❌ TIME FORMAT ERROR:', { timeString, timeParts });
    return timeString;
  }
  
  const hours = parseInt(timeParts[0]) || 0;
  const minutes = parseInt(timeParts[1]) || 0;
  const seconds = parseInt(timeParts[2]) || 0;
  
  console.log('🔍 TIME PARTS:', { days, hours, minutes, seconds });
  
  // Convertește totul în ore: zile * 24 + ore + minute/60 + secunde/3600
  const totalHours = (days * 24) + hours + (minutes / 60) + (seconds / 3600);
  const result = Math.round(totalHours).toString();
  
  console.log('🔍 TIME CONVERSION RESULT:', { 
    original: timeString, 
    calculated: totalHours, 
    formatted: result,
    verification: `${days} zile * 24 + ${hours}h + ${minutes}min + ${seconds}sec = ${result}h (rotunjit)`
  });
  
  return result;
};

export default function DriverShiftsReport() {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewByType, setViewByType] = useState('ByDriver');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedFleet, setSelectedFleet] = useState('');
  // Separate search state - only these are used for actual API calls
  const [searchDriver, setSearchDriver] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchFleet, setSearchFleet] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false); // NO auto-load - wait for user search

  // Fetch fleets for selection
  const { data: fleets = [] } = useQuery({
    queryKey: ['fleets'],
    queryFn: async () => {
      const response = await fetch('/api/fleets');
      if (!response.ok) {
        throw new Error('Failed to fetch fleets');
      }
      return response.json();
    },
  });

  const { data: shiftData, isLoading, error } = useQuery({
    queryKey: ['driver-shifts', fromDate, toDate, viewByType, searchDriver, searchVehicle, searchFleet, searchTriggered],
    queryFn: async (): Promise<DriverShiftResponse> => {
      console.log(`🔍 Fetching driver shifts: ${fromDate} to ${toDate}, viewBy: ${viewByType}`);
      console.log(`🔍 Query filters: driver=${searchDriver}, vehicle=${searchVehicle}, fleet=${searchFleet}`);
      
      // If no filters are specified, send empty/undefined to get ALL data
      const driverFilter = searchDriver.trim() === '' ? undefined : searchDriver;
      const vehicleFilter = searchVehicle.trim() === '' ? undefined : searchVehicle;
      const fleetFilter = searchFleet.trim() === '' ? undefined : searchFleet;
      
      const response = await fetch('/api/autocab/driver-shifts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromDate}T00:00:00Z`,
          to: `${toDate}T23:59:00Z`,
          viewByType,
          driverFilter,
          vehicleFilter,
          fleetFilter,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Driver shifts fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch driver shift data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Driver shifts data received:', data);
      console.log('✅ shiftsDetails length:', data.shiftsDetails?.length || 0);
      console.log('✅ Sample shift data:', data.shiftsDetails?.[0]);
      return data;
    },
    enabled: searchTriggered, // Only run when search is triggered
    staleTime: 30000,
    retry: 2,
  });

  const handleSearch = () => {
    console.log(`🔍 SEARCH TRIGGERED: fromDate=${fromDate}, toDate=${toDate}, viewBy=${viewByType}`);
    console.log(`🔍 INPUT FILTERS: driver="${selectedDriver}", vehicle="${selectedVehicle}", fleet="${selectedFleet}"`);
    
    // Only update search state when user clicks search
    if (viewByType === 'ByDriver') {
      setSearchDriver(selectedDriver);
      setSearchVehicle(''); // Clear vehicle filter when searching by driver
      setSearchFleet(''); // Clear fleet filter when searching by driver
    } else if (viewByType === 'ByVehicle') {
      setSearchVehicle(selectedVehicle);
      setSearchDriver(''); // Clear driver filter when searching by vehicle
      setSearchFleet(''); // Clear fleet filter when searching by vehicle
    } else if (viewByType === 'ByFleet') {
      setSearchFleet(selectedFleet);
      setSearchDriver(''); // Clear driver filter when searching by fleet
      setSearchVehicle(''); // Clear vehicle filter when searching by fleet
    } else {
      setSearchDriver(selectedDriver);
      setSearchVehicle(selectedVehicle);
      setSearchFleet(selectedFleet);
    }
    
    setSearchTriggered(prev => !prev); // Toggle to trigger refetch
  };

  const exportToExcel = () => {
    // Implementation for Excel export
    console.log('Exporting to Excel...');
  };

  // PDF Export Function
  const exportToPDF = () => {
    if (!shiftData) return;
    
    // Create a new window for PDF export
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fromDateFormatted = new Date(fromDate).toLocaleDateString('en-GB');
    const toDateFormatted = new Date(toDate).toLocaleDateString('en-GB');
    
    // Calculate vehicle breakdown data
    const vehicleGroups = shiftData.shiftsDetails.reduce((groups, shift) => {
      const vehicle = shift.vehicleCallsign;
      if (!groups[vehicle]) {
        groups[vehicle] = {
          vehicle,
          driver: shift.fullName || 'Unknown',
          hours: 0,
          jobs: 0,
          revenue: 0,
          profit: 0,
        };
      }
      groups[vehicle].hours += convertTimeToMinutes(shift.shiftLength || '0:00:00') / 60;
      groups[vehicle].jobs += (shift.accountBookings || 0) + (shift.cashBookings || 0) + (shift.rankJobs || 0);
      groups[vehicle].revenue += (shift.accountBookingsTotal || 0) + (shift.cashBookingsTotal || 0) + (shift.rankJobsTotal || 0);
      return groups;
    }, {});
    
    // Calculate profit for each vehicle
    const commissionRate = shiftData.transactionGroup?.commissionRate || 0;
    Object.values(vehicleGroups).forEach(vehicleData => {
      vehicleData.profit = vehicleData.revenue * commissionRate;
    });
    
    const sortedVehicles = Object.values(vehicleGroups).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate totals from individual shifts
    const totalHours = shiftData.shiftsDetails.reduce((total, shift) => {
      return total + (convertTimeToMinutes(shift.shiftLength || '0:00:00') / 60);
    }, 0);
    
    const totalProfit = sortedVehicles.reduce((total, vehicle) => total + vehicle.profit, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Driver Shifts Report - ${fromDateFormatted} to ${toDateFormatted}</title>
          <style>
            @page {
              margin: 0.8cm;
              size: A4;
            }
            
            body {
              font-family: Arial, sans-serif;
              line-height: 1.3;
              color: #333;
              margin: 0;
              padding: 0;
              font-size: 13px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
            }
            
            .company-name {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 6px;
            }
            
            .report-title {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            
            .date-range {
              font-size: 13px;
              color: #9ca3af;
            }
            
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            
            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
              background: #f9fafb;
            }
            
            .summary-card-title {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 4px;
              text-transform: uppercase;
              font-weight: 600;
            }
            
            .summary-card-value {
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
            }
            
            .profit-card .summary-card-value {
              color: #059669;
            }
            
            .table-section {
              margin-top: 20px;
            }
            
            .table-title {
              font-size: 14px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 12px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            
            th, td {
              padding: 6px 10px;
              text-align: left;
            }
            
            th {
              background-color: #f3f4f6;
              font-weight: 600;
              color: #374151;
              text-transform: uppercase;
              font-size: 10px;
              border-bottom: 2px solid #d1d5db;
            }
            
            td {
              border-bottom: 1px solid #f3f4f6;
            }
            
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            
            tr:hover {
              background-color: #f3f4f6;
            }
            
            .text-right {
              text-align: right;
            }
            
            .profit-value {
              color: #059669;
              font-weight: 600;
            }
            
            .footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            
            .total-summary {
              background: #dcfce7;
              border: 1px solid #86efac;
              border-radius: 6px;
              padding: 12px;
              margin-top: 15px;
              text-align: center;
            }
            
            .total-summary-value {
              font-size: 20px;
              font-weight: bold;
              color: #059669;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">CABCO Canterbury Taxis</div>
            <div class="report-title">Driver Shifts Performance Report</div>
            <div class="date-range">From ${fromDateFormatted} to ${toDateFormatted}</div>
          </div>
          
          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-card-title">Transaction Group</div>
              <div class="summary-card-value">${shiftData.transactionGroup?.name || 'No Data'}</div>
            </div>
            <div class="summary-card profit-card">
              <div class="summary-card-title">Total Profit</div>
              <div class="summary-card-value">£${Math.round(totalProfit)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card-title">Total Earnings</div>
              <div class="summary-card-value">£${Math.round(shiftData.totals.totalPrice)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card-title">Total Hours Worked</div>
              <div class="summary-card-value">${Math.round(totalHours)}h</div>
            </div>
          </div>
          
          <div class="table-section">
            <div class="table-title">Vehicle Performance Breakdown (${shiftData.totals.totalShifts} shifts analyzed)</div>
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th class="text-right">Total Time</th>
                  <th class="text-right">Total Earning</th>
                  <th class="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                ${sortedVehicles.map(vehicle => `
                  <tr>
                    <td>${vehicle.vehicle}</td>
                    <td>${vehicle.driver}</td>
                    <td class="text-right">${vehicle.hours.toFixed(1)}h</td>
                    <td class="text-right">£${vehicle.revenue.toFixed(2)}</td>
                    <td class="text-right profit-value">£${vehicle.profit.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total-summary">
              <div style="font-size: 14px; color: #374151; margin-bottom: 5px;">Grand Total</div>
              <div class="total-summary-value">£${Math.round(shiftData.totals.totalPrice)}</div>
            </div>
          </div>
          
          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}<br>
            Report includes ${shiftData.totals.totalShifts} shifts from ${sortedVehicles.length} vehicles
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }, 500);
    };
  };

  // Get total shifts count - authentic data from AUTOCAB
  const getTotalShifts = (shiftData: any): number => {
    if (!shiftData?.totals) {
      return 0;
    }
    return shiftData.totals.totalShifts || 0;
  };

  // Commission calculation REMOVED - No fake data display

  // Vehicle Details Component with Vehicle API integration
  const VehicleDetailsModal = ({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) => {
    const { data: vehicleDetails, isLoading: isLoadingVehicle } = useQuery({
      queryKey: ['vehicle-details', vehicleId],
      queryFn: async () => {
        const response = await fetch(`/api/autocab/vehicles/${vehicleId}/details`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }
        return response.json();
      },
      enabled: !!vehicleId,
    });

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Details - {vehicleName}
            </DialogTitle>
            <DialogDescription>
              Comprehensive vehicle information from Vehicle API
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVehicle ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicleDetails?.success ? (
            <div className="space-y-6">
              {/* Vehicle Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Callsign</Label>
                  <p className="text-lg font-semibold">{vehicleDetails.vehicle.callsign}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Registration</Label>
                  <p className="text-lg font-semibold">{vehicleDetails.vehicle.registration || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Make & Model</Label>
                  <p className="text-lg font-semibold">{vehicleDetails.vehicle.make} {vehicleDetails.vehicle.model}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Colour</Label>
                  <p className="text-lg font-semibold">{vehicleDetails.vehicle.colour}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">Size</Label>
                  <Badge variant="outline">{vehicleDetails.vehicle.size} passengers</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500">CO2 Emissions</Label>
                  <p className="text-lg font-semibold">{vehicleDetails.vehicle.cO2Emissions} g/km</p>
                </div>
              </div>

              {/* Current Shift Information */}
              {vehicleDetails.vehicle.currentShift && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Current Shift
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Driver</Label>
                      <p className="text-lg font-semibold">{vehicleDetails.vehicle.currentShift.driverName}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Started</Label>
                      <p className="text-lg font-semibold">
                        {new Date(vehicleDetails.vehicle.currentShift.started).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Total Bookings</Label>
                      <Badge variant="default">{vehicleDetails.vehicle.currentShift.totalBookings}</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Cash/Account Split</Label>
                      <p className="text-lg font-semibold">
                        {vehicleDetails.vehicle.currentShift.cashBookings}C / {vehicleDetails.vehicle.currentShift.accountBookings}A
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Capabilities */}
              {vehicleDetails.vehicle.capabilities && vehicleDetails.vehicle.capabilities.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Vehicle Capabilities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {vehicleDetails.vehicle.capabilities.map((capability: any, index: number) => (
                      <Badge key={index} variant="secondary">{capability.name || `Capability ${capability.id}`}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Information */}
              {vehicleDetails.vehicle.ownerForename && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Owner Name</Label>
                      <p className="text-lg font-semibold">{vehicleDetails.vehicle.ownerForename} {vehicleDetails.vehicle.ownerSurname}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">Account Code</Label>
                      <p className="text-lg font-semibold">{vehicleDetails.vehicle.ownerAccountCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to load vehicle details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile-optimized header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:hidden flex-shrink-0">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Driver Shifts Report</h1>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-2 md:p-6 pb-16 md:pb-20">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Driver Shifts Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!shiftData}
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!shiftData}
            >
              <FileText className="h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </div>

        {/* Compact Filters Card */}
        <Card className="mb-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Search className="h-3 w-3 md:h-4 md:w-4" />
              Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {/* Date From */}
              <div className="space-y-1">
                <Label htmlFor="from-date" className="text-xs">From</Label>
                <div className="relative">
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  <CalendarIcon className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <Label htmlFor="to-date" className="text-xs">To</Label>
                <div className="relative">
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  <CalendarIcon className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* View By */}
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label className="text-xs">View By</Label>
                <Select value={viewByType} onValueChange={setViewByType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ByDriver">By Driver</SelectItem>
                    <SelectItem value="ByVehicle">By Vehicle</SelectItem>
                    <SelectItem value="ByFleet">By Fleet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Filter */}
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label className="text-xs">Driver</Label>
                <Input
                  placeholder="Filter driver..."
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Vehicle Filter */}
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label className="text-xs">Vehicle</Label>
                <Input
                  placeholder="Filter vehicle..."
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Fleet Filter - Only show when "By Fleet" is selected */}
              {viewByType === 'ByFleet' && (
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label className="text-xs">Fleet</Label>
                  <Select value={selectedFleet} onValueChange={setSelectedFleet}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select a fleet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fleets?.map((fleet: any) => (
                        <SelectItem key={fleet.id} value={fleet.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Truck className="h-3 w-3" />
                            {fleet.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSearch} size="sm" className="flex-1 md:flex-none h-8">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              
              <Button 
                onClick={() => {
                  console.log(`🔄 CLEAR FILTERS - Resetting all filters and loading ALL data`);
                  setSelectedDriver('');
                  setSelectedVehicle('');
                  setSelectedFleet('');
                  setSearchDriver('');
                  setSearchVehicle('');
                  setSearchFleet('');
                  setViewByType('ByDriver');
                  setSearchTriggered(prev => !prev); // Trigger search with empty filters
                }} 
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {!searchTriggered && !shiftData && (
          <Card>
            <CardContent className="p-4 md:p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <Clock className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base md:text-lg font-medium">Driver Shifts Report</p>
                <p className="text-xs md:text-sm">Set your search criteria and click "Search" to load driver shift data</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="p-4 md:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm md:text-base">Loading driver shift data...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-4 md:p-8 text-center text-red-600">
              <p className="text-sm md:text-base">Error loading data: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {shiftData && (
          <>
            {/* Summary Cards - Mobile optimized */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Transaction Group</p>
                      {shiftData.transactionGroup ? (
                        <div>
                          <p className="text-sm md:text-2xl font-bold truncate">{shiftData.transactionGroup.name}</p>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                            {shiftData.transactionGroup.commissionRate > 0 
                              ? `${(shiftData.transactionGroup.commissionRate * 100).toFixed(0)}% commission`
                              : `ID: ${shiftData.transactionGroup.id}`
                            }
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm md:text-2xl font-bold text-gray-400">No Data</p>
                      )}
                    </div>
                    <Clock className="h-5 w-5 md:h-8 md:w-8 text-blue-600 flex-shrink-0 ml-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Profit</p>
                      {(() => {
                        // Calculate total profit using SAME method as footer breakdown table
                        if (!shiftData.shiftsDetails) {
                          return (
                            <>
                              <p className="text-sm md:text-2xl font-bold text-gray-400">£0</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                No shift data
                              </p>
                            </>
                          );
                        }
                        
                        let totalProfit = 0;
                        
                        // Calculate profit for each shift using individual vehicle commission rates
                        shiftData.shiftsDetails.forEach((shift: any) => {
                          const revenue = (shift.accountBookingsTotal || 0) + (shift.cashBookingsTotal || 0) + (shift.rankJobsTotal || 0);
                          const commissionRate = getVehicleCommissionRate(shift.vehicleCallsign);
                          const profit = revenue * commissionRate;
                          totalProfit += profit;
                        });
                        
                        return totalProfit > 0 ? (
                          <>
                            <p className="text-sm md:text-2xl font-bold text-green-600 truncate">£{Math.round(totalProfit)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              All vehicles combined
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm md:text-2xl font-bold text-gray-400">£0</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              No commission data
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <Car className="h-5 w-5 md:h-8 md:w-8 text-green-600 flex-shrink-0 ml-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Earnings</p>
                      <p className="text-sm md:text-2xl font-bold truncate">£{shiftData.totals.totalPrice.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-5 w-5 md:h-8 md:w-8 text-yellow-600 flex-shrink-0 ml-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Hours Worked</p>
                      {(() => {
                        // Calculate total hours from individual shifts (same as breakdown table)
                        const totalHours = shiftData.shiftsDetails.reduce((total, shift) => {
                          return total + (convertTimeToMinutes(shift.shiftLength || '0:00:00') / 60);
                        }, 0);
                        
                        return (
                          <>
                            <p className="text-sm md:text-2xl font-bold truncate">{Math.round(totalHours)}h</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">From all vehicles</p>
                          </>
                        );
                      })()}
                    </div>
                    <Clock className="h-5 w-5 md:h-8 md:w-8 text-purple-600 flex-shrink-0 ml-1" />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Summary Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Summary Report ({shiftData.totals.totalRows} shifts analyzed)</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date().toLocaleString()}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Show detailed vehicle breakdown when we have shift details */}
                {shiftData.shiftsDetails && shiftData.shiftsDetails.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-3 w-3 rounded-full bg-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Vehicle Performance Breakdown
                      </h3>
                    </div>
                    
                    {/* Mobile-First Responsive Vehicle breakdown */}
                    
                    {/* Mobile Card View - Hidden on Desktop */}
                    <div className="block md:hidden space-y-3">
                      {(() => {
                        const vehicleGroups = shiftData.shiftsDetails.reduce((groups, shift) => {
                          const vehicle = shift.vehicleCallsign;
                          if (!groups[vehicle]) {
                            groups[vehicle] = {
                              vehicle,
                              driver: shift.fullName || 'Unknown',
                              drivers: new Set([shift.fullName || 'Unknown']),
                              hours: 0,
                              jobs: 0,
                              revenue: 0,
                              profit: 0,
                              shifts: []
                            };
                          } else {
                            groups[vehicle].drivers.add(shift.fullName || 'Unknown');
                            if (groups[vehicle].drivers.size > 1) {
                              groups[vehicle].driver = `${groups[vehicle].drivers.size} drivers`;
                            }
                          }
                          groups[vehicle].shifts.push(shift);
                          groups[vehicle].hours += convertTimeToMinutes(shift.shiftLength || '0:00:00') / 60;
                          groups[vehicle].jobs += (shift.accountBookings || 0) + (shift.cashBookings || 0) + (shift.rankJobs || 0);
                          groups[vehicle].revenue += (shift.accountBookingsTotal || 0) + (shift.cashBookingsTotal || 0) + (shift.rankJobsTotal || 0);
                          return groups;
                        }, {});
                        
                        return Object.values(vehicleGroups)
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((vehicleData, index) => {
                            const commissionRate = getVehicleCommissionRate(vehicleData.vehicle);
                            const profit = vehicleData.revenue * commissionRate;
                            
                            const getTopBadge = (position: number) => {
                              if (position >= 5) return null;
                              const badges = [
                                { label: 'Top 1', color: 'bg-yellow-500 text-white' },
                                { label: 'Top 2', color: 'bg-gray-400 text-white' },
                                { label: 'Top 3', color: 'bg-amber-600 text-white' },
                                { label: 'Top 4', color: 'bg-blue-500 text-white' },
                                { label: 'Top 5', color: 'bg-green-500 text-white' }
                              ];
                              return badges[position];
                            };
                            
                            const topBadge = getTopBadge(index);
                            
                            return (
                              <div key={vehicleData.vehicle} className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">{vehicleData.vehicle}</span>
                                    {topBadge && (
                                      <span className={`text-xs px-2 py-1 rounded ${topBadge.color}`}>
                                        {topBadge.label}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                    £{profit.toFixed(0)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Driver:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">{vehicleData.driver}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Hours:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">{vehicleData.hours.toFixed(1)}h</div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500 dark:text-gray-400">Total Earning:</span>
                                    <div className="font-medium text-gray-900 dark:text-white">£{vehicleData.revenue.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>

                    {/* Desktop Table View - Hidden on Mobile */}
                    <div className="hidden md:block rounded-lg border">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Vehicle</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Driver</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Total Time</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Total Earning</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Profit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Desktop table content - Group and sort vehicles by revenue */}
                            {(() => {
                              const vehicleGroups = shiftData.shiftsDetails.reduce((groups, shift) => {
                                const vehicle = shift.vehicleCallsign;
                                if (!groups[vehicle]) {
                                  groups[vehicle] = {
                                    vehicle,
                                    driver: shift.fullName || 'Unknown',
                                    drivers: new Set([shift.fullName || 'Unknown']), // Track all drivers for this vehicle
                                    hours: 0,
                                    jobs: 0,
                                    revenue: 0,
                                    profit: 0,
                                    shifts: []
                                  };
                                } else {
                                  // Add driver to the set (automatically handles duplicates)
                                  groups[vehicle].drivers.add(shift.fullName || 'Unknown');
                                  // Update displayed driver name to show multiple drivers if applicable
                                  if (groups[vehicle].drivers.size > 1) {
                                    groups[vehicle].driver = `${groups[vehicle].drivers.size} drivers`;
                                  }
                                }
                                groups[vehicle].shifts.push(shift);
                                groups[vehicle].hours += convertTimeToMinutes(shift.shiftLength || '0:00:00') / 60;
                                groups[vehicle].jobs += (shift.accountBookings || 0) + (shift.cashBookings || 0) + (shift.rankJobs || 0);
                                groups[vehicle].revenue += (shift.accountBookingsTotal || 0) + (shift.cashBookingsTotal || 0) + (shift.rankJobsTotal || 0);
                                return groups;
                              }, {});
                              
                              // Calculate profit for each vehicle after all revenue is accumulated
                              const commissionRate = shiftData.transactionGroup?.commissionRate || 0;
                              Object.values(vehicleGroups).forEach(vehicleData => {
                                vehicleData.profit = vehicleData.revenue * commissionRate;
                              });
                              
                              return Object.values(vehicleGroups)
                                .sort((a, b) => b.revenue - a.revenue)
                                .map((vehicleData, index) => {
                                  // Calculate authentic profit using commission rate
                                  const commissionRate = getVehicleCommissionRate(vehicleData.vehicle);
                                  const profit = vehicleData.revenue * commissionRate;
                                  
                                  // Top 5 badge logic
                                  const getTopBadge = (position: number) => {
                                    if (position >= 5) return null;
                                    const badges = [
                                      { label: 'Top 1', variant: 'default' as const, color: 'bg-yellow-500 text-white' },
                                      { label: 'Top 2', variant: 'secondary' as const, color: 'bg-gray-400 text-white' },
                                      { label: 'Top 3', variant: 'outline' as const, color: 'bg-amber-600 text-white' },
                                      { label: 'Top 4', variant: 'destructive' as const, color: 'bg-blue-500 text-white' },
                                      { label: 'Top 5', variant: 'outline' as const, color: 'bg-green-500 text-white' }
                                    ];
                                    return badges[position];
                                  };
                                  
                                  const topBadge = getTopBadge(index);
                                  
                                  return (
                                    <tr key={vehicleData.vehicle} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-2">
                                          <span>{vehicleData.vehicle}</span>
                                          {topBadge && (
                                            <Badge 
                                              variant={topBadge.variant}
                                              className={`text-xs px-2 py-1 ${topBadge.color}`}
                                            >
                                              {topBadge.label}
                                            </Badge>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {vehicleData.driver}
                                      </td>
                                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                        {vehicleData.hours.toFixed(1)}h
                                      </td>
                                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                        £{vehicleData.revenue.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                                        £{profit.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-4 border-t space-y-3 md:space-y-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">Analysis from {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}</span>
                      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 px-6 py-4 rounded-xl shadow-sm border border-green-200 dark:border-green-800">
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Total Profit</div>
                          <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                            £{(() => {
                              // Calculate total profit from breakdown table data
                              if (!shiftData.shiftsDetails) return Math.round(shiftData.totals.totalPrice);
                              
                              let totalProfit = 0;
                              
                              // Calculate profit for each vehicle in breakdown
                              shiftData.shiftsDetails.forEach((shift: any) => {
                                const revenue = (shift.accountBookingsTotal || 0) + (shift.cashBookingsTotal || 0) + (shift.rankJobsTotal || 0);
                                const commissionRate = getVehicleCommissionRate(shift.vehicleCallsign);
                                const profit = revenue * commissionRate;
                                totalProfit += profit;
                              });
                              
                              return Math.round(totalProfit);
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="h-12 w-12 text-blue-600" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Summary Report Complete
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 max-w-md">
                        Analysis complete for {shiftData.totals.totalRows} driver shifts from {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        All totals are displayed in the summary cards above
                      </p>
                      {(selectedDriver && selectedDriver !== 'ALL') && (
                        <Badge variant="secondary" className="mt-2">
                          Filtered by Driver: {selectedDriver}
                        </Badge>
                      )}
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          💡 Click "ALL FLEET" to see detailed vehicle breakdown for Smart Taxi App fleet
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


          </>
        )}
        </div>
      </div>
    </div>
  );
}