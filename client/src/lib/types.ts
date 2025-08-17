// API Response Types
export interface VehiclesApiResponse {
  success: boolean;
  vehicles: Vehicle[];
  error?: string;
}

export interface ConfigApiResponse {
  GOOGLE_API_KEY: string;
  [key: string]: any;
}

// Vehicle Interface - matches AUTOCAB API specification
export interface Vehicle {
  id: number;
  callsign: string;
  make: string;
  model: string;
  registration: string;
  zone?: string;
  timeClear?: string;
  status: string;
  statusColor?: string; // green, yellow, red, gray based on AUTOCAB status
  isActive: boolean;
  isSuspended: boolean;
  coordinates?: { lat: number; lng: number };
  vehicleType?: string;
  companyId?: number;
  rowVersion?: number;
  driverId?: number;
  lastUpdate?: string;
  driverName?: string;
  driverCallsign?: string;
  vehicleName?: string;
  isCalling?: boolean;
  shiftStats?: {
    cashBookings: number;
    accountBookings: number;
    rankJobs: number;
  };
  shiftDurationHours?: number;
  shiftId?: string;
}

// Google Maps Types
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

// Job Data Interface
export interface JobData {
  date: string;
  time: string;
  pickup: string;
  destination: string;
  customerName: string;
  phoneNumbers: string;
  customerPhone?: string;
  passengers: string;
  luggage: string;
  driverNote: string;
  vehicleType: string;
  price: string;
  viaPoints: string[];
  jobNumber?: string;
  customerAccount?: string;
  mobilityAids?: string;
  customerReference?: string;
}

// Component Props Types
export interface VehicleListPanelProps {
  onVehicleSelect?: (vehicle: Vehicle) => void;
  selectedVehicle?: Vehicle | null;
  onViewStats?: (vehicle: Vehicle) => void;
}

export interface GoogleMapsPanelProps {
  selectedVehicle?: Vehicle | null;
  vehicles?: Vehicle[];
}

// Extracted Job Data Interface for Smart Extract functionality
export interface ExtractedJobData {
  jobNumber?: string;
  date?: string;
  time?: string;
  pickup?: string;
  destination?: string;
  via1?: string;
  via2?: string;
  via3?: string;
  via4?: string;
  via5?: string;
  customerName?: string;
  customerPhone?: string;
  customerReference?: string;
  passengers?: number;
  luggage?: number;
  vehicleType?: string;
  mobilityAids?: string;
  price?: string;
  pickupNote?: string;
  via1Note?: string;
  via2Note?: string;
  via3Note?: string;
  via4Note?: string;
  via5Note?: string;
  destinationNote?: string;
}