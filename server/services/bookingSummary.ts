import { searchAutocabByJobNumber } from './autocabLookup';
import { getAutocabBookingDetails } from './autocab';

interface BookingSummaryData {
  bookingId: string;
  bookingType: string;
  status: string;
  pickupDueTime: string;
  bookedAtTime: string;
  
  // Journey Details
  pickup: {
    address: string;
    zone: string;
    coordinates: { lat: number; lng: number };
    note?: string;
  };
  vias: Array<{
    address: string;
    zone: string;
    coordinates: { lat: number; lng: number };
    note?: string;
  }>;
  destination: {
    address: string;
    zone: string;
    coordinates: { lat: number; lng: number };
    note?: string;
  };
  
  // Customer Details
  customerName: string;
  phoneNumbers: string[];
  passengers: number;
  driverNote: string;
  vehicleRequirements: string;
  
  // Pricing & Account
  pricing: {
    totalPrice: number;
    currency: string;
    tariff: string;
    isManual: boolean;
    accountType: string;
    paymentMethod: string;
  };
  
  // Vehicle & Driver
  assignedVehicle?: string;
  assignedDriver?: string;
  
  // Journey Metrics
  distance: {
    miles: number;
    duration: number;
  };
  
  // References
  yourReference: string;
  ourReference: string;
  companyName: string;
}

/**
 * Generate comprehensive booking summary for AI Chat responses
 */
export async function generateBookingSummary(bookingId: string): Promise<string> {
  try {
    console.log(`📋 GENERATING BOOKING SUMMARY: ${bookingId}`);
    
    // Use existing working function to get booking details
    const bookingDetails = await getAutocabBookingDetails(bookingId);
    console.log(`📋 Booking details response:`, JSON.stringify(bookingDetails, null, 2));
    
    if (!bookingDetails || !bookingDetails.success) {
      console.log(`❌ Booking details failed:`, bookingDetails);
      return `❌ Booking ${bookingId} not found in Autocab system`;
    }

    const booking = bookingDetails.booking;
    console.log(`📋 Parsed booking object:`, JSON.stringify(booking, null, 2));
    
    // Parse booking data
    const summary: BookingSummaryData = {
      bookingId: bookingId,
      bookingType: booking.bookingType || 'Unknown',
      status: getBookingStatus(booking),
      pickupDueTime: formatDateTime(booking.pickupDueTime),
      bookedAtTime: formatDateTime(booking.bookedAtTime),
      
      pickup: {
        address: booking.pickup?.address?.text || 'Not specified',
        zone: booking.pickup?.address?.zone?.name || 'Unknown Zone',
        coordinates: {
          lat: booking.pickup?.address?.coordinate?.latitude || 0,
          lng: booking.pickup?.address?.coordinate?.longitude || 0
        },
        note: booking.pickup?.note || ''
      },
      
      vias: (booking.vias || []).map((via: any) => ({
        address: via.address?.text || 'Not specified',
        zone: via.address?.zone?.name || 'Unknown Zone',
        coordinates: {
          lat: via.address?.coordinate?.latitude || 0,
          lng: via.address?.coordinate?.longitude || 0
        },
        note: via.note || ''
      })),
      
      destination: {
        address: booking.destination?.address?.text || 'Not specified',
        zone: booking.destination?.address?.zone?.name || 'Unknown Zone',
        coordinates: {
          lat: booking.destination?.address?.coordinate?.latitude || 0,
          lng: booking.destination?.address?.coordinate?.longitude || 0
        },
        note: booking.destination?.note || ''
      },
      
      customerName: booking.name || 'Not specified',
      phoneNumbers: parsePhoneNumbers(booking.telephoneNumber),
      passengers: booking.passengers || 1,
      driverNote: booking.driverNote || '',
      vehicleRequirements: extractVehicleRequirements(booking),
      
      pricing: {
        totalPrice: booking.pricing?.price || 0,
        currency: 'GBP',
        tariff: booking.pricing?.pricingTariff || 'Unknown',
        isManual: booking.pricing?.isManual || false,
        accountType: getAccountType(booking.pricing),
        paymentMethod: getPaymentMethod(booking.pricing)
      },
      
      assignedVehicle: getAssignedVehicle(booking),
      assignedDriver: getAssignedDriver(booking),
      
      distance: {
        miles: booking.distance || 0,
        duration: booking.duration || 0
      },
      
      yourReference: booking.yourReferences?.yourReference1 || '',
      ourReference: booking.ourReference || '',
      companyName: 'CABCO Canterbury Taxis'
    };

    return formatBookingSummary(summary);
    
  } catch (error) {
    console.error('❌ Error generating booking summary:', error);
    return `❌ Error retrieving booking ${bookingId}: ${error.message}`;
  }
}

/**
 * Search for bookings by phone number and generate summaries
 */
export async function searchBookingsByPhone(phoneNumber: string): Promise<string> {
  try {
    const apiKey = process.env.AUTOCAB_API_KEY;
    if (!apiKey) {
      return `❌ Cannot search bookings - API configuration missing`;
    }

    const searchPayload = {
      telephoneNumber: phoneNumber,
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
      pageSize: 10
    };

    const response = await fetch('https://autocab-api.azure-api.net/booking/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey
      },
      body: JSON.stringify(searchPayload)
    });

    if (!response.ok) {
      return `❌ Phone search failed for ${phoneNumber}`;
    }

    const results = await response.json();
    const bookings = results.bookings || [];

    if (bookings.length === 0) {
      return `📞 No bookings found for phone number ${phoneNumber} in the last 60 days`;
    }

    let summary = `📞 **PHONE SEARCH RESULTS: ${phoneNumber}**\n`;
    summary += `Found ${bookings.length} booking(s):\n\n`;

    for (const booking of bookings.slice(0, 5)) { // Show first 5 bookings
      summary += `🎫 **Booking ${booking.bookingId}**\n`;
      summary += `📅 ${formatDateTime(booking.pickupDueTime)}\n`;
      summary += `📍 ${booking.pickup?.address?.text || 'Unknown pickup'}\n`;
      summary += `🏁 ${booking.destination?.address?.text || 'Unknown destination'}\n`;
      summary += `💷 £${booking.pricing?.price || 0}\n`;
      summary += `👤 ${booking.name || 'Unknown customer'}\n\n`;
    }

    if (bookings.length > 5) {
      summary += `... and ${bookings.length - 5} more bookings\n`;
    }

    return summary;

  } catch (error) {
    console.error('❌ Error searching by phone:', error);
    return `❌ Error searching phone ${phoneNumber}: ${error.message}`;
  }
}

// Helper functions
function getBookingStatus(booking: any): string {
  if (booking.pickup?.completed && booking.destination?.completed) return 'Completed';
  if (booking.pickup?.completed) return 'In Progress';
  if (booking.assignedVehicle) return 'Dispatched';
  if (booking.bookingType === 'Advanced') return 'Scheduled';
  return 'Pending';
}

function formatDateTime(dateTime: string): string {
  if (!dateTime) return 'Not specified';
  const date = new Date(dateTime);
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parsePhoneNumbers(phoneString: string): string[] {
  if (!phoneString) return [];
  return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
}

function extractVehicleRequirements(booking: any): string {
  const requirements = [];
  if (booking.driverNote?.includes('MPV')) requirements.push('MPV');
  if (booking.driverNote?.includes('Estate')) requirements.push('Estate');
  if (booking.driverNote?.includes('Large')) requirements.push('Large Vehicle');
  if (booking.driverNote?.includes('wheelchair')) requirements.push('Wheelchair Accessible');
  if (booking.passengers > 4) requirements.push('Large Vehicle Required');
  
  return requirements.join(', ') || 'Standard vehicle';
}

function getAccountType(pricing: any): string {
  if (!pricing) return 'Unknown';
  if (pricing.accountAmount > 0) return 'Account';
  if (pricing.cashAmount > 0) return 'Cash';
  return 'Cash';
}

function getPaymentMethod(pricing: any): string {
  if (!pricing) return 'Unknown';
  if (pricing.accountAmount > 0) return 'Account Billing';
  if (pricing.cardAmount > 0) return 'Card Payment';
  return 'Cash Payment';
}

function getAssignedVehicle(booking: any): string {
  return booking.vehicle?.callsign || booking.assignedVehicle || 'Not assigned';
}

function getAssignedDriver(booking: any): string {
  return booking.driver?.name || booking.assignedDriver || 'Not assigned';
}

function formatBookingSummary(summary: BookingSummaryData): string {
  let result = `🎫 **BOOKING SUMMARY - ID: ${summary.bookingId}**\n\n`;
  
  // Basic Information
  result += `📋 **BOOKING DETAILS**\n`;
  result += `• Type: ${summary.bookingType}\n`;
  result += `• Status: ${summary.status}\n`;
  result += `• Pickup Time: ${summary.pickupDueTime}\n`;
  result += `• Booked: ${summary.bookedAtTime}\n`;
  result += `• Company: ${summary.companyName}\n\n`;
  
  // Journey Information
  result += `🗺️ **JOURNEY DETAILS**\n`;
  result += `📍 **Pickup**: ${summary.pickup.address}\n`;
  result += `   Zone: ${summary.pickup.zone}\n`;
  if (summary.pickup.note) result += `   Note: ${summary.pickup.note}\n`;
  
  // Via points
  if (summary.vias.length > 0) {
    summary.vias.forEach((via, index) => {
      result += `🔵 **Via ${index + 1}**: ${via.address}\n`;
      result += `   Zone: ${via.zone}\n`;
      if (via.note) result += `   Note: ${via.note}\n`;
    });
  }
  
  result += `🏁 **Destination**: ${summary.destination.address}\n`;
  result += `   Zone: ${summary.destination.zone}\n`;
  if (summary.destination.note) result += `   Note: ${summary.destination.note}\n`;
  
  // Distance & Duration
  if (summary.distance.miles > 0) {
    result += `📏 **Distance**: ${summary.distance.miles} miles\n`;
  }
  if (summary.distance.duration > 0) {
    result += `⏱️ **Duration**: ${Math.round(summary.distance.duration / 60)} minutes\n`;
  }
  result += `\n`;
  
  // Customer Information
  result += `👤 **CUSTOMER DETAILS**\n`;
  result += `• Name: ${summary.customerName}\n`;
  result += `• Phone: ${summary.phoneNumbers.join(', ')}\n`;
  result += `• Passengers: ${summary.passengers}\n`;
  if (summary.driverNote) result += `• Driver Note: ${summary.driverNote}\n`;
  result += `• Vehicle Requirements: ${summary.vehicleRequirements}\n\n`;
  
  // Pricing Information
  result += `💷 **PRICING & PAYMENT**\n`;
  result += `• Total Price: £${summary.pricing.totalPrice}\n`;
  result += `• Tariff: ${summary.pricing.tariff}\n`;
  result += `• Manual Price: ${summary.pricing.isManual ? 'Yes' : 'No'}\n`;
  result += `• Account Type: ${summary.pricing.accountType}\n`;
  result += `• Payment Method: ${summary.pricing.paymentMethod}\n\n`;
  
  // Vehicle & Driver Assignment
  result += `🚗 **ASSIGNMENT**\n`;
  result += `• Vehicle: ${summary.assignedVehicle}\n`;
  result += `• Driver: ${summary.assignedDriver}\n\n`;
  
  // References
  if (summary.yourReference || summary.ourReference) {
    result += `📝 **REFERENCES**\n`;
    if (summary.yourReference) result += `• Your Reference: ${summary.yourReference}\n`;
    if (summary.ourReference) result += `• Our Reference: ${summary.ourReference}\n`;
  }
  
  return result;
}