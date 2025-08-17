# AUTOCAB CRUD Operations Guide - Complete Implementation

## Overview
Ghid complet pentru toate operațiunile CRUD cu AUTOCAB: Create, Read, Update, Delete bookings + Price Quotes.

---

## 1. CREATE BOOKING (Creare Booking Nou)

### Endpoint & Method
```
POST https://autocab-api.azure-api.net/booking/v1/booking
```

### Payload Structure
Folosește structura din `AUTOCAB_BOOKING_SUBMISSION_GUIDE.md` - aceea documentație este completă pentru crearea de bookinguri noi.

### Response Success
```json
{
  "bookingId": "374403",
  "status": "confirmed",
  "rowVersion": "AAAAAACXrwc="
}
```

---

## 2. READ BOOKING (Citirea Booking Existent)

### Get Booking by ID
```
GET https://autocab-api.azure-api.net/booking/v1/booking/{bookingId}
```

### Headers
```json
{
  "Ocp-Apim-Subscription-Key": "YOUR_API_KEY"
}
```

### Example Implementation
```javascript
export async function getAutocabBookingDetails(bookingId) {
  const apiKey = process.env.AUTOCAB_API_KEY;
  
  const response = await fetch(`https://autocab-api.azure-api.net/booking/v1/booking/${bookingId}`, {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey
    }
  });
  
  if (response.ok) {
    const bookingData = await response.json();
    return {
      success: true,
      booking: bookingData
    };
  } else {
    return {
      success: false,
      error: `HTTP ${response.status}: ${await response.text()}`
    };
  }
}
```

### Response Structure
```json
{
  "bookingId": "374403",
  "pickupDueTime": "2025-07-07T14:30:00.000",
  "name": "John Smith",
  "telephoneNumber": "+441622858998",
  "customerId": 97,
  "pickup": {
    "address": {
      "text": "Canterbury Cathedral, Canterbury CT1 2TR",
      "coordinate": {
        "latitude": 51.2808,
        "longitude": 1.0789
      }
    }
  },
  "destination": {
    "address": {
      "text": "Dover Western Docks, Dover CT17 9TJ"
    }
  },
  "pricing": {
    "price": 157.50,
    "isManual": true,
    "isLocked": true
  },
  "yourReferences": {
    "yourReference1": "1807250088",
    "yourReference2": "SGH-SAGA"
  },
  "rowVersion": "AAAAAACXrwc=",  // CRITICAL pentru editare
  "status": "confirmed"
}
```

---

## 3. UPDATE BOOKING (Editarea Booking Existent)

### Method 1: Direct POST Modification (RECOMANDAT)
```
POST https://autocab-api.azure-api.net/booking/v1/booking/{bookingId}
```

### Headers
```json
{
  "Ocp-Apim-Subscription-Key": "YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

### Critical Implementation Steps

#### Step 1: Get Current Booking Data
```javascript
const currentBooking = await getAutocabBookingDetails(bookingId);
if (!currentBooking.success) {
  return { success: false, error: "Booking not found" };
}
```

#### Step 2: Preserve rowVersion și Structure
```javascript
const preservedFields = {
  bookingId: currentBooking.booking.bookingId,
  rowVersion: currentBooking.booking.rowVersion,  // CRITICAL
  status: currentBooking.booking.status,
  // Păstrează toate câmpurile care nu se modifică
  customerId: currentBooking.booking.customerId,
  paymentMethod: currentBooking.booking.paymentMethod,
  // etc...
};
```

#### Step 3: Update Only Modified Fields
```javascript
const updatedPayload = {
  ...preservedFields,
  // Actualizează doar câmpurile modificate
  pickupDueTime: newPickupTimeString,
  name: newCustomerName,
  telephoneNumber: newPhoneNumber,
  
  // Update pickup address
  pickup: {
    ...currentBooking.booking.pickup,
    address: {
      ...currentBooking.booking.pickup.address,
      text: newPickupAddress,
      coordinate: {
        latitude: newPickupCoords.lat,
        longitude: newPickupCoords.lng,
        isEmpty: false
      }
    }
  },
  
  // Update pricing with manual override preserved
  pricing: {
    ...currentBooking.booking.pricing,
    price: parseFloat(newPrice),
    cost: parseFloat(newPrice),
    fare: parseFloat(newPrice),
    cashAmount: parseFloat(newPrice),
    isManual: true,  // MAINTAIN manual override
    isLocked: true,  // MAINTAIN price lock
    pricingTariff: "MANUAL INSERT - SAGA Price Override"
  }
};
```

#### Step 4: Send POST Request
```javascript
const response = await fetch(`https://autocab-api.azure-api.net/booking/v1/booking/${bookingId}`, {
  method: 'POST',
  headers: {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedPayload)
});
```

### Complete Update Function
```javascript
export async function updateAutocabBooking(bookingId, newBookingData) {
  try {
    // Step 1: Get current booking
    const currentResult = await getAutocabBookingDetails(bookingId);
    if (!currentResult.success) {
      return { success: false, error: "Booking not found" };
    }
    
    // Step 2: Parse new coordinates
    const pickupCoords = await getCoordinatesFromGoogle(newBookingData.pickup);
    const destinationCoords = await getCoordinatesFromGoogle(newBookingData.destination);
    
    // Step 3: Build updated payload preserving structure
    const updatedPayload = {
      ...currentResult.booking,  // Preserve all existing fields
      
      // Update only modified fields
      pickupDueTime: parseUKDateTime(newBookingData.date, newBookingData.time),
      name: newBookingData.customerName,
      telephoneNumber: cleanPhoneNumber(newBookingData.customerPhone),
      passengers: newBookingData.passengers,
      luggage: newBookingData.luggage,
      
      pickup: {
        ...currentResult.booking.pickup,
        address: {
          ...currentResult.booking.pickup.address,
          text: newBookingData.pickup,
          coordinate: {
            latitude: pickupCoords.lat,
            longitude: pickupCoords.lng,
            isEmpty: false
          }
        }
      },
      
      destination: {
        ...currentResult.booking.destination,
        address: {
          ...currentResult.booking.destination.address,
          text: newBookingData.destination,
          coordinate: {
            latitude: destinationCoords.lat,
            longitude: destinationCoords.lng,
            isEmpty: false
          }
        }
      },
      
      pricing: {
        ...currentResult.booking.pricing,
        price: parseFloat(newBookingData.price),
        cost: parseFloat(newBookingData.price),
        fare: parseFloat(newBookingData.price),
        cashAmount: parseFloat(newBookingData.price),
        isManual: true,
        isLocked: true,
        pricingTariff: "MANUAL INSERT - SAGA Price Override"
      }
    };
    
    // Step 4: Send update
    const response = await fetch(`https://autocab-api.azure-api.net/booking/v1/booking/${bookingId}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedPayload)
    });
    
    if (response.ok) {
      return {
        success: true,
        bookingId: bookingId,  // SAME ID - direct edit
        message: `Booking ${bookingId} updated successfully`
      };
    } else if (response.status === 406) {
      // Try with override parameter
      const overrideResponse = await fetch(`https://autocab-api.azure-api.net/booking/v1/booking/${bookingId}?override=true`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPayload)
      });
      
      if (overrideResponse.ok) {
        return {
          success: true,
          bookingId: bookingId,
          message: `Booking ${bookingId} updated with override`
        };
      }
    }
    
    return {
      success: false,
      error: `Update failed: HTTP ${response.status}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Method 2: Fallback Cancel+Create (DOAR dacă direct edit failed)
```javascript
async function fallbackCancelCreate(bookingId, newBookingData) {
  // Step 1: Cancel existing booking
  const cancelResult = await cancelAutocabBooking(bookingId);
  
  if (cancelResult.success) {
    // Step 2: Create new booking
    const createResult = await submitBookingToAutocab(newBookingData);
    
    if (createResult.success) {
      return {
        success: true,
        bookingId: createResult.bookingId,  // NEW ID
        message: `Booking replaced: ${bookingId} → ${createResult.bookingId}`
      };
    }
  }
  
  return { success: false, error: "Fallback failed" };
}
```

---

## 4. DELETE BOOKING (Anularea Booking)

### Endpoint & Method
```
DELETE https://autocab-api.azure-api.net/booking/v1/booking/{bookingId}
```

### Implementation
```javascript
export async function cancelAutocabBooking(bookingId) {
  const apiKey = process.env.AUTOCAB_API_KEY;
  
  try {
    const response = await fetch(`https://autocab-api.azure-api.net/booking/v1/booking/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });
    
    if (response.ok) {
      return {
        success: true,
        message: `Booking ${bookingId} cancelled successfully`
      };
    } else if (response.status === 404) {
      return {
        success: false,
        error: `Booking ${bookingId} not found (already cancelled or archived)`
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `Cancellation failed: HTTP ${response.status} - ${errorText}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error.message}`
    };
  }
}
```

---

## 5. PRICE QUOTES (Prețuri Informative)

### Endpoint & Method
```
POST https://autocab-api.azure-api.net/booking/v1/quote
```

### Headers
```json
{
  "Ocp-Apim-Subscription-Key": "YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

### Payload Structure
```javascript
const quotePayload = {
  pickup: {
    address: {
      text: "Canterbury Cathedral, Canterbury CT1 2TR",
      coordinate: {
        latitude: 51.2808,
        longitude: 1.0789,
        isEmpty: false
      }
    }
  },
  destination: {
    address: {
      text: "Dover Western Docks, Dover CT17 9TJ",
      coordinate: {
        latitude: 51.1279,
        longitude: 1.3134,
        isEmpty: false
      }
    }
  },
  vias: [],  // Via points if any
  passengers: 2,
  luggage: 1,
  pickupDueTime: "2025-07-07T14:30:00.000",
  customerId: 97,  // SGH-SAGA account
  paymentMethod: "Cash"
};
```

### Complete Quote Function
```javascript
export async function getAutocabQuote(quoteData) {
  const apiKey = process.env.AUTOCAB_API_KEY;
  
  try {
    // Get coordinates for pickup and destination
    const pickupCoords = await getCoordinatesFromGoogle(quoteData.pickup);
    const destinationCoords = await getCoordinatesFromGoogle(quoteData.destination);
    
    // Build via points if any
    const viasPayload = [];
    if (quoteData.viaPoints && quoteData.viaPoints.length > 0) {
      for (const viaPoint of quoteData.viaPoints) {
        const viaCoords = await getCoordinatesFromGoogle(viaPoint);
        viasPayload.push({
          address: {
            text: viaPoint,
            coordinate: {
              latitude: viaCoords.lat,
              longitude: viaCoords.lng,
              isEmpty: false
            }
          }
        });
      }
    }
    
    const quotePayload = {
      pickup: {
        address: {
          text: quoteData.pickup,
          coordinate: {
            latitude: pickupCoords.lat,
            longitude: pickupCoords.lng,
            isEmpty: false
          }
        }
      },
      destination: {
        address: {
          text: quoteData.destination,
          coordinate: {
            latitude: destinationCoords.lat,
            longitude: destinationCoords.lng,
            isEmpty: false
          }
        }
      },
      vias: viasPayload,
      passengers: quoteData.passengers || 1,
      luggage: quoteData.luggage || 0,
      pickupDueTime: parseUKDateTime(quoteData.date, quoteData.time),
      customerId: 97,  // SGH-SAGA
      paymentMethod: "Cash"
    };
    
    const response = await fetch('https://autocab-api.azure-api.net/booking/v1/quote', {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quotePayload)
    });
    
    if (response.ok) {
      const quoteResult = await response.json();
      return {
        success: true,
        quote: {
          price: quoteResult.pricing?.price || 0,
          distance: quoteResult.distance || 0,
          duration: quoteResult.duration || 0,
          currency: quoteResult.pricing?.currency || "GBP",
          breakdown: quoteResult.pricing
        }
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `Quote failed: HTTP ${response.status} - ${errorText}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: `Quote error: ${error.message}`
    };
  }
}
```

### Quote Response Structure
```json
{
  "pricing": {
    "price": 45.50,
    "currency": "GBP",
    "breakdown": {
      "baseFare": 35.00,
      "distanceCharge": 8.50,
      "timeCharge": 2.00
    }
  },
  "distance": 25.3,  // km
  "duration": 28,    // minutes
  "vehicleType": "Standard"
}
```

---

## 6. Search Existing Bookings (Căutarea Bookingurilor)

### Search by Reference
```
GET https://autocab-api.azure-api.net/booking/v2/search-bookings?yourReference1={jobNumber}&fromDate={date}&toDate={date}
```

### Implementation
```javascript
export async function searchAutocabByJobNumber(jobNumber) {
  const apiKey = process.env.AUTOCAB_API_KEY;
  
  // Search from today to 3 months ahead
  const fromDate = new Date().toISOString().split('T')[0];
  const toDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const searchUrl = `https://autocab-api.azure-api.net/booking/v2/search-bookings?yourReference1=${encodeURIComponent(jobNumber)}&fromDate=${fromDate}&toDate=${toDate}`;
  
  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });
    
    if (response.ok) {
      const searchResults = await response.json();
      
      if (searchResults.bookings && searchResults.bookings.length > 0) {
        return {
          success: true,
          exists: true,
          bookingId: searchResults.bookings[0].bookingId,
          bookingDetails: searchResults.bookings[0]
        };
      } else {
        return {
          success: true,
          exists: false
        };
      }
    } else {
      return {
        success: false,
        error: `Search failed: HTTP ${response.status}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: `Search error: ${error.message}`
    };
  }
}
```

---

## 7. Complete Workflow Examples

### Example 1: Edit Existing Booking
```javascript
// 1. Search for existing booking
const searchResult = await searchAutocabByJobNumber("1807250088");

if (searchResult.exists) {
  // 2. Update the booking
  const updateResult = await updateAutocabBooking(searchResult.bookingId, {
    date: "08/07/2025",
    time: "15:30",
    pickup: "Dover Priory Station, Dover CT17 9QH",
    destination: "Canterbury West Station, Canterbury CT1 2BR",
    customerName: "Jane Smith",
    customerPhone: "01622999888",
    passengers: 3,
    luggage: 2,
    price: "75.00"
  });
  
  console.log("Update result:", updateResult);
} else {
  console.log("Booking not found");
}
```

### Example 2: Get Price Quote
```javascript
const quoteResult = await getAutocabQuote({
  pickup: "Canterbury Cathedral, Canterbury CT1 2TR",
  destination: "Dover Western Docks, Dover CT17 9TJ",
  viaPoints: ["Harrietsham Station, Maidstone ME17 1AQ"],
  passengers: 2,
  luggage: 1,
  date: "08/07/2025",
  time: "14:30"
});

if (quoteResult.success) {
  console.log(`Quote: £${quoteResult.quote.price} for ${quoteResult.quote.distance}km`);
} else {
  console.log("Quote failed:", quoteResult.error);
}
```

### Example 3: Cancel Booking
```javascript
const cancelResult = await cancelAutocabBooking("374403");

if (cancelResult.success) {
  console.log("Booking cancelled successfully");
} else {
  console.log("Cancellation failed:", cancelResult.error);
}
```

---

## 8. Critical Success Factors

### For Editing Bookings:
1. **Preserve rowVersion** - Essential pentru direct edit
2. **Maintain Manual Pricing** - `isManual: true, isLocked: true`
3. **Keep Customer ID** - Nu schimba customerId=97
4. **Preserve Structure** - Folosește toate câmpurile existente

### For Price Quotes:
1. **Include Coordinates** - Coordinate precise pentru toate adresele
2. **Via Points** - Include punctele intermediare pentru quote corect
3. **Customer Context** - Folosește customerId=97 pentru prețuri SAGA

### For Cancellations:
1. **Check Status First** - Verifică dacă booking-ul există
2. **Handle 404 Gracefully** - Booking-ul poate fi deja anulat
3. **Error Handling** - Gestionează toate cazurile de error

---

## 9. Error Handling Patterns

```javascript
// Comprehensive error handling
try {
  const result = await autocabOperation();
  
  if (result.success) {
    return { success: true, data: result };
  } else {
    // Log error for debugging
    console.error('AUTOCAB Error:', result.error);
    
    // Return user-friendly message
    return {
      success: false,
      userMessage: getUserFriendlyError(result.error),
      technicalError: result.error
    };
  }
} catch (networkError) {
  console.error('Network Error:', networkError);
  return {
    success: false,
    userMessage: "Connection error. Please try again.",
    technicalError: networkError.message
  };
}
```

Această documentație completează setul CRUD pentru AUTOCAB și oferă AI-ului tău toate instrumentele necesare pentru operațiuni complete cu bookingurile SAGA.