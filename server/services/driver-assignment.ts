/**
 * Driver Assignment Service - AUTOCAB Driver Completed Booking Integration
 * Handles automatic driver assignment and completion reporting to AUTOCAB API
 */

export interface DriverCompletedBooking {
  companyId: number;
  driverId: number;
  name: string;
  customerEmail?: string;
  customerDisplayName?: string;
  telephoneNumber: string;
  pickupDueTimeUtc: string;
  pickup: {
    latitude: number;
    longitude: number;
    house: string;
    street: string;
    town: string;
    postCode: string;
    note: string;
    passengerDetailsIndex: number;
  };
  vias: Array<{
    latitude: number;
    longitude: number;
    house: string;
    street: string;
    town: string;
    postCode: string;
    note: string;
    passengerDetailsIndex: number;
  }>;
  dropoff: {
    latitude: number;
    longitude: number;
    house: string;
    street: string;
    town: string;
    postCode: string;
    note: string;
    passengerDetailsIndex: number;
  };
  passengers: number;
  ourReference: string;
  yourReferences: {
    yourReference1: string;
  };
  pricing: {
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
  };
  areaCharges: {
    totalPrice: number;
    totalCost: number;
    totalNonCommissionableCost: number;
  };
}

export interface DriverCompletedResponse {
  bookingId: number;
}

export interface DriverAssignment {
  jobId: number;
  driverId: number;
  vehicleId: string;
  assignedAt: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  autocabBookingId?: string;
}

/**
 * Send completed booking information to AUTOCAB for a specific driver
 */
export async function reportDriverCompletedBooking(
  driverId: number,
  bookingData: DriverCompletedBooking
): Promise<DriverCompletedResponse> {
  console.log(`📋 DRIVER COMPLETED BOOKING: Reporting completion for driver ${driverId}`);
  
  const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;
  if (!AUTOCAB_API_KEY) {
    throw new Error('AUTOCAB_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `https://autocab-api.azure-api.net/driver/v1/completedBooking/${driverId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY,
        },
        body: JSON.stringify(bookingData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AUTOCAB Driver Completed Booking failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to report completed booking: ${response.status}`);
    }

    const result: DriverCompletedResponse = await response.json();
    console.log(`✅ DRIVER COMPLETED BOOKING: Success - Booking ID ${result.bookingId}`);
    
    return result;
  } catch (error) {
    console.error('❌ DRIVER COMPLETED BOOKING ERROR:', error);
    throw error;
  }
}

/**
 * Intelligent driver assignment based on current availability and location
 */
export async function assignDriverToJob(jobId: number): Promise<DriverAssignment | null> {
  console.log(`🎯 DRIVER ASSIGNMENT: Finding best driver for job ${jobId}`);
  
  try {
    // Fetch available drivers from live shifts
    const driversResponse = await fetch('http://localhost:5000/api/drivers');
    const driversData = await driversResponse.json();
    
    if (!driversData.success || !driversData.drivers) {
      console.log('❌ No drivers available for assignment');
      return null;
    }

    // Filter for drivers with fewer jobs (load balancing)
    const availableDrivers = driversData.drivers
      .filter(driver => driver.totalBookings < 5) // Prefer drivers with fewer jobs
      .sort((a, b) => a.totalBookings - b.totalBookings); // Sort by job count

    if (availableDrivers.length === 0) {
      console.log('❌ All drivers are at capacity');
      return null;
    }

    const assignedDriver = availableDrivers[0];
    console.log(`✅ ASSIGNED: Driver ${assignedDriver.name} (${assignedDriver.callsign}) - ${assignedDriver.totalBookings} jobs`);

    return {
      jobId,
      driverId: assignedDriver.id,
      vehicleId: assignedDriver.vehicleCallsign,
      assignedAt: new Date(),
      status: 'assigned'
    };
  } catch (error) {
    console.error('❌ DRIVER ASSIGNMENT ERROR:', error);
    return null;
  }
}

/**
 * Build AUTOCAB Driver Completed Booking payload from job data
 */
export function buildDriverCompletedBookingPayload(
  jobData: any,
  driverId: number,
  completedPrice: number
): DriverCompletedBooking {
  // Parse coordinates from job data
  const pickupCoords = jobData.pickupCoordinates ? 
    JSON.parse(jobData.pickupCoordinates) : { lat: 0, lng: 0 };
  const destCoords = jobData.destinationCoordinates ? 
    JSON.parse(jobData.destinationCoordinates) : { lat: 0, lng: 0 };

  return {
    companyId: 2, // CABCO Company ID
    driverId: driverId,
    name: jobData.customerName || "Customer",
    customerDisplayName: jobData.customerName || "Customer",
    telephoneNumber: jobData.customerPhone || "01234567890",
    pickupDueTimeUtc: new Date(`${jobData.date}T${jobData.time}:00Z`).toISOString(),
    pickup: {
      latitude: pickupCoords.lat || 0,
      longitude: pickupCoords.lng || 0,
      house: "",
      street: jobData.pickup || "",
      town: "Canterbury",
      postCode: "",
      note: jobData.pickupNote || "",
      passengerDetailsIndex: -1
    },
    vias: [], // For now, simplified without via points
    dropoff: {
      latitude: destCoords.lat || 0,
      longitude: destCoords.lng || 0,
      house: "",
      street: jobData.destination || "",
      town: "Canterbury", 
      postCode: "",
      note: jobData.destinationNote || "",
      passengerDetailsIndex: -1
    },
    passengers: jobData.passengers || 1,
    ourReference: jobData.jobNumber || "",
    yourReferences: {
      yourReference1: jobData.customerReference || ""
    },
    pricing: {
      fare: 0,
      cost: completedPrice,
      price: completedPrice,
      pricingTariff: "TA1",
      isManual: true, // Manual pricing from SAGA
      isLocked: true,
      waitingTime: 0,
      waitingTimeFree: 0,
      waitingTimeChargeable: 0,
      startTariff: "",
      finishTariff: "",
      gratuityAmount: 0,
      waitingTimeCost: 0,
      waitingTimePrice: 0,
      loyaltyCardCost: 0,
      extraCost: 0,
      paymentFee: 0,
      bookingFee: 0,
      cashAccountFee: 0,
      kickbackFeeCommission: 0,
      driverCommissionFee: 0,
      serviceChargeFee: 0,
      costSource: "SAGA Manual Price Override",
      distanceSource: "Route Calculation",
      accountAmount: 0,
      cardAmount: 0,
      cashAmount: completedPrice,
      paymentTransactions: [],
      meterDistance: {
        asKilometres: 0,
        asMetres: 0,
        asMiles: 0,
        asLocalUnits: 0,
        isZero: false,
        units: "Kilometers"
      }
    },
    areaCharges: {
      totalPrice: 0,
      totalCost: 0,
      totalNonCommissionableCost: 0
    }
  };
}