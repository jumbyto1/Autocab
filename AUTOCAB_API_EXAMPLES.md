# Autocab API Integration - Complete Examples

## Overview

This document provides complete working examples for integrating with the Autocab booking API, including all required fields, proper data structures, and error handling patterns used in the taxi booking system.

## Authentication & Configuration

```typescript
// Environment configuration
const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;
const AUTOCAB_BASE_URL = 'https://autocab-api.azure-api.net/booking/v1';
const CUSTOMER_ID = 97; // SGH-SAGA account ID

// Request headers
const headers = {
  'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY,
  'Content-Type': 'application/json'
};
```

## Complete Booking Creation Example

### Single Stop Booking

```typescript
async function createSimpleBooking() {
  const booking = {
    pickupDueTime: "2025-07-09T09:50:00.000Z",
    pickup: {
      address: {
        bookingPriority: 0,
        coordinate: {
          latitude: 51.1137696,
          longitude: 1.3145346,
          isEmpty: false
        },
        id: -1,
        isCustom: false,
        postCode: "CT17 9DQ",
        source: "UserTyped",
        street: "Dover Western Docks",
        text: "Cruise Terminal One, Dover Western Docks, Dover, Kent, CT17 9DQ",
        town: "Dover",
        house: "",
        zone: {
          id: 1,
          name: "Zone 1",
          descriptor: "001",
          mdtZoneId: 1
        },
        zoneId: 1
      },
      note: "",
      passengerDetailsIndex: null,
      type: "Pickup"
    },
    vias: [],
    destination: {
      address: {
        bookingPriority: 0,
        coordinate: {
          latitude: 51.3390782,
          longitude: -0.7053958,
          isEmpty: false
        },
        id: -1,
        isCustom: false,
        postCode: "GU15 1PD",
        source: "UserTyped",
        street: "Stonegate",
        text: "4 Stonegate, Camberley, Surrey, GU15 1PD",
        town: "Camberley",
        house: "4",
        zone: {
          id: 1,
          name: "Zone 1",
          descriptor: "001",
          mdtZoneId: 1
        },
        zoneId: 1
      },
      note: "",
      passengerDetailsIndex: null,
      type: "Destination"
    },
    passengers: 2,
    name: "Mr William Butler, Mrs Elizabeth Butler",
    telephoneNumber: "+4407985700498",
    paymentMethod: "Cash",
    paymentType: "Cash",
    luggage: 2,
    customerId: 97,
    yourReferences: {
      yourReference1: "1807250084",
      yourReference2: "SGH-SAGA"
    },
    ourReference: "CabCo Assistant",
    company: "Cab & Co Canterbury",
    priority: 5,
    driverNote: "Vehicle: Saloon, Passengers: 2, Luggage: 2"
  };

  try {
    const response = await fetch(`${AUTOCAB_BASE_URL}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(booking)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Booking created:', result.bookingId);
      return { success: true, bookingId: result.bookingId };
    } else {
      console.error('❌ Booking failed:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return { success: false, error: error.message };
  }
}
```

### Multi-Stop Booking with Via Points

```typescript
async function createMultiStopBooking() {
  const booking = {
    pickupDueTime: "2025-07-09T09:50:00.000Z",
    pickup: {
      address: {
        bookingPriority: 0,
        coordinate: {
          latitude: 51.1137696,
          longitude: 1.3145346,
          isEmpty: false
        },
        id: -1,
        isCustom: false,
        postCode: "CT17 9DQ",
        source: "UserTyped",
        street: "Dover Western Docks",
        text: "Cruise Terminal One, Dover Western Docks, Dover, Kent, CT17 9DQ",
        town: "Dover",
        house: "",
        zone: {
          id: 1,
          name: "Zone 1",
          descriptor: "001",
          mdtZoneId: 1
        },
        zoneId: 1
      },
      note: "",
      passengerDetailsIndex: null,
      type: "Pickup"
    },
    vias: [
      {
        address: {
          bookingPriority: 0,
          coordinate: {
            latitude: 51.3662828,
            longitude: -0.6882166,
            isEmpty: false
          },
          id: -1,
          isCustom: false,
          postCode: "GU19 5BS",
          source: "UserTyped",
          street: "Lory Ridge",
          text: "42, Lory Ridge, Bagshot, Surrey, GU19 5BS",
          town: "Bagshot",
          house: "42",
          zone: {
            id: 1,
            name: "Zone 1",
            descriptor: "001",
            mdtZoneId: 1
          },
          zoneId: 1
        },
        note: "",
        passengerDetailsIndex: null,
        type: "Via"
      },
      {
        address: {
          bookingPriority: 0,
          coordinate: {
            latitude: 51.33919179999999,
            longitude: -0.7058516,
            isEmpty: false
          },
          id: -1,
          isCustom: false,
          postCode: "GU15 1PD",
          source: "UserTyped",
          street: "Stonegate",
          text: "2, Stonegate, Camberley, Surrey, GU15 1PD",
          town: "Camberley",
          house: "2",
          zone: {
            id: 1,
            name: "Zone 1",
            descriptor: "001",
            mdtZoneId: 1
          },
          zoneId: 1
        },
        note: "",
        passengerDetailsIndex: null,
        type: "Via"
      }
    ],
    destination: {
      address: {
        bookingPriority: 0,
        coordinate: {
          latitude: 51.3390782,
          longitude: -0.7053958,
          isEmpty: false
        },
        id: -1,
        isCustom: false,
        postCode: "GU15 1PD",
        source: "UserTyped",
        street: "Stonegate",
        text: "4 Stonegate, Camberley, Surrey, GU15 1PD",
        town: "Camberley",
        house: "4",
        zone: {
          id: 1,
          name: "Zone 1",
          descriptor: "001",
          mdtZoneId: 1
        },
        zoneId: 1
      },
      note: "",
      passengerDetailsIndex: null,
      type: "Destination"
    },
    passengers: 4,
    name: "Ms Caroline Davies, Mrs Margaret Banks, Mr David Isbill, Mrs Barbara Isbill",
    telephoneNumber: "+4407889237731",
    paymentMethod: "Cash",
    paymentType: "Cash",
    luggage: 4,
    customerId: 97,
    yourReferences: {
      yourReference1: "905250548",
      yourReference2: "SGH-SAGA"
    },
    ourReference: "CabCo Assistant",
    company: "Cab & Co Canterbury",
    priority: 5,
    driverNote: "Vehicle: Large MPV, Passengers: 4, Luggage: 4, Ship: Spirit Of Adventure"
  };

  try {
    const response = await fetch(`${AUTOCAB_BASE_URL}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(booking)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Multi-stop booking created:', result.bookingId);
      return { success: true, bookingId: result.bookingId };
    } else {
      console.error('❌ Multi-stop booking failed:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return { success: false, error: error.message };
  }
}
```

## Booking Cancellation Example

```typescript
async function cancelBooking(bookingId: string) {
  try {
    const response = await fetch(`${AUTOCAB_BASE_URL}/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY
      }
    });

    if (response.ok) {
      console.log(`✅ Booking ${bookingId} cancelled successfully`);
      return { success: true, message: `Booking ${bookingId} cancelled successfully` };
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to cancel booking ${bookingId}:`, errorText);
      return { 
        success: false, 
        message: `Failed to cancel booking: HTTP ${response.status}`,
        error: errorText 
      };
    }
  } catch (error) {
    console.error(`❌ Network error cancelling booking ${bookingId}:`, error);
    return { 
      success: false, 
      message: 'Network error during cancellation',
      error: error.message 
    };
  }
}
```

## Address Processing Helper Functions

### Google Maps Coordinate Lookup

```typescript
async function getCoordinatesFromGoogle(address: string): Promise<{lat: number; lng: number}> {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`📍 Coordinates for "${address}":`, location);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.error(`❌ No coordinates found for: ${address}`);
      throw new Error(`No coordinates found for address: ${address}`);
    }
  } catch (error) {
    console.error(`❌ Geocoding error for "${address}":`, error);
    throw error;
  }
}
```

### Address Parsing

```typescript
function parseAddressParts(text: string): {
  house: string;
  street: string;
  town: string;
  postcode: string;
} {
  // Extract UK postcode
  const postcodeMatch = text.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})$/i);
  const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : '';
  
  // Extract house number
  const houseMatch = text.match(/^(\d+),?\s*/);
  const house = houseMatch ? houseMatch[1] : '';
  
  // Remove postcode and house from address
  let remaining = text.replace(postcode, '').trim();
  if (house) {
    remaining = remaining.replace(/^\d+,?\s*/, '');
  }
  
  // Split remaining parts
  const parts = remaining.split(',').map(p => p.trim()).filter(p => p);
  
  return {
    house,
    street: parts[0] || '',
    town: parts[parts.length - 1] || '',
    postcode
  };
}
```

### Create Autocab Address Object

```typescript
function createAddressObject(text: string, coords: {lat: number; lng: number}): any {
  const { house, street, town, postcode } = parseAddressParts(text);
  
  return {
    bookingPriority: 0,
    coordinate: {
      latitude: coords.lat,
      longitude: coords.lng,
      isEmpty: false
    },
    id: -1,
    isCustom: false,
    postCode: postcode,
    source: "UserTyped",
    street: street,
    text: text,
    town: town,
    house: house,
    zone: {
      id: 1,
      name: "Zone 1",
      descriptor: "001",
      mdtZoneId: 1
    },
    zoneId: 1
  };
}
```

## Phone Number Processing

```typescript
function cleanPhoneNumber(phone: string): string {
  // Extract first valid number and format for Autocab
  const phoneNumbers = phone.split(/[,/]/).map(p => p.trim());
  
  for (const num of phoneNumbers) {
    let cleaned = num.replace(/[\s()-]/g, '');
    
    // Convert to international format
    if (cleaned.startsWith('0')) {
      cleaned = '+44' + cleaned.substring(1);
    } else if (cleaned.match(/^[17]/)) {
      cleaned = '+440' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+44' + cleaned;
    }
    
    // Validate UK mobile or landline
    if (cleaned.match(/^\+44[017]\d{8,9}$/)) {
      return cleaned;
    }
  }
  
  // Fallback: return first number with +44 prefix
  const firstNum = phoneNumbers[0]?.replace(/[\s()-]/g, '') || '';
  return firstNum.startsWith('+44') ? firstNum : '+44' + firstNum;
}
```

## Complete Integration Service

```typescript
export class AutocabService {
  private apiKey: string;
  private baseUrl: string;
  private customerId: number;

  constructor(apiKey: string, customerId: number = 97) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://autocab-api.azure-api.net/booking/v1';
    this.customerId = customerId;
  }

  private get headers() {
    return {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async sendBooking(bookingData: JobBookingData): Promise<{
    success: boolean;
    bookingId?: string;
    error?: string;
  }> {
    try {
      // Get coordinates for all addresses
      const pickupCoords = await getCoordinatesFromGoogle(bookingData.pickup);
      const dropoffCoords = await getCoordinatesFromGoogle(bookingData.destination);
      
      // Process via points
      const viaPoints = [];
      for (let i = 1; i <= 5; i++) {
        const viaKey = `via${i}` as keyof JobBookingData;
        const viaPoint = bookingData[viaKey];
        
        if (viaPoint && typeof viaPoint === 'string' && viaPoint.trim()) {
          try {
            const viaCoords = await getCoordinatesFromGoogle(viaPoint.trim());
            viaPoints.push({
              address: createAddressObject(viaPoint.trim(), viaCoords),
              note: "",
              passengerDetailsIndex: null,
              type: "Via"
            });
          } catch (error) {
            console.warn(`⚠️ Could not geocode via point: ${viaPoint}`);
          }
        }
      }

      // Parse pickup date and time
      const pickupDateTime = new Date(`${bookingData.date}T${bookingData.time}:00.000Z`);

      // Create Autocab payload
      const autocabPayload = {
        pickupDueTime: pickupDateTime.toISOString(),
        pickup: {
          address: createAddressObject(bookingData.pickup, pickupCoords),
          note: "",
          passengerDetailsIndex: null,
          type: "Pickup"
        },
        vias: viaPoints,
        destination: {
          address: createAddressObject(bookingData.destination, dropoffCoords),
          note: "",
          passengerDetailsIndex: null,
          type: "Destination"
        },
        passengers: bookingData.passengers,
        name: bookingData.customerName,
        telephoneNumber: cleanPhoneNumber(bookingData.customerPhone),
        paymentMethod: "Cash",
        paymentType: "Cash",
        luggage: bookingData.luggage,
        customerId: this.customerId,
        yourReferences: {
          yourReference1: bookingData.jobNumber || bookingData.customerReference || '',
          yourReference2: bookingData.customerAccount || 'CASH'
        },
        ourReference: "CabCo Assistant",
        company: "Cab & Co Canterbury",
        priority: 5,
        driverNote: bookingData.driverNotes || `Vehicle: ${bookingData.vehicleType}, Passengers: ${bookingData.passengers}, Luggage: ${bookingData.luggage}`
      };

      console.log('📦 Sending booking to Autocab:', autocabPayload);

      const response = await fetch(`${this.baseUrl}/bookings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(autocabPayload)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Autocab booking successful:', result);
        return {
          success: true,
          bookingId: result.bookingId?.toString()
        };
      } else {
        console.error('❌ Autocab booking failed:', result);
        return {
          success: false,
          error: result.message || 'Unknown error'
        };
      }

    } catch (error) {
      console.error('❌ Booking submission error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelBooking(bookingId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: `Booking ${bookingId} cancelled successfully`
        };
      } else {
        return {
          success: false,
          message: `Failed to cancel booking: HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Network error: ${error.message}`
      };
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Create a test booking for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const testBooking = {
        date: tomorrow.toISOString().split('T')[0],
        time: "10:00",
        pickup: "Test Pickup Address",
        destination: "Test Destination Address",
        customerName: "Test Customer",
        customerPhone: "07123456789",
        passengers: 1,
        luggage: 0,
        vehicleType: "Saloon",
        price: "10.00"
      };

      const result = await this.sendBooking(testBooking);
      
      if (result.success) {
        // Cancel the test booking immediately
        await this.cancelBooking(result.bookingId!);
        return {
          success: true,
          message: "Autocab connection test successful"
        };
      } else {
        return {
          success: false,
          message: `Connection test failed: ${result.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test error: ${error.message}`
      };
    }
  }
}
```

## Usage Examples

### Basic Integration

```typescript
// Initialize service
const autocabService = new AutocabService(
  process.env.AUTOCAB_API_KEY!,
  97 // SGH-SAGA customer ID
);

// Test connection
const testResult = await autocabService.testConnection();
console.log('Connection test:', testResult);

// Send booking
const bookingResult = await autocabService.sendBooking({
  date: "2025-07-09",
  time: "09:50",
  pickup: "Cruise Terminal One, Dover Western Docks, Dover, Kent, CT17 9DQ",
  destination: "4 Stonegate, Camberley, Surrey, GU15 1PD",
  via1: "42, Lory Ridge, Bagshot, Surrey, GU19 5BS",
  customerName: "Ms Caroline Davies",
  customerPhone: "07889237731",
  passengers: 4,
  luggage: 4,
  vehicleType: "Large MPV",
  price: "208.00",
  customerAccount: "SGH-SAGA",
  jobNumber: "905250548"
});

if (bookingResult.success) {
  console.log('Booking created:', bookingResult.bookingId);
  
  // Cancel if it's a test
  await autocabService.cancelBooking(bookingResult.bookingId!);
}
```

This comprehensive guide provides all the necessary examples and patterns for successfully integrating with the Autocab API in any taxi booking system implementation.