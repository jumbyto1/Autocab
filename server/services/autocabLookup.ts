// Use built-in fetch available in Node.js 18+

interface AutocabSearchResult {
  bookingId?: string;
  exists: boolean;
  bookingDetails?: any;
}

/**
 * Search Autocab for existing bookings by job number (Your Reference)
 * Searches from current day to 3 months in advance as requested
 */
export async function searchAutocabByJobNumber(jobNumber: string): Promise<AutocabSearchResult> {
  try {
    const apiKey = process.env.AUTOCAB_API_KEY;
    if (!apiKey) {
      console.error('❌ AUTOCAB_API_KEY not found');
      return { exists: false };
    }

    // Date range: 3 months back to 6 months in advance (comprehensive search)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeMonthsBack = new Date(today);
    threeMonthsBack.setMonth(threeMonthsBack.getMonth() - 3);
    
    const sixMonthsAhead = new Date(today);
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
    
    const fromDate = threeMonthsBack.toISOString();
    const toDate = sixMonthsAhead.toISOString();

    console.log(`🔍 Searching Autocab for job ${jobNumber} from ${fromDate} to ${toDate}`);

    // Use the extended booking search v2 endpoint with comprehensive parameters
    const searchUrl = `https://autocab-api.azure-api.net/booking/v1/search`;
    
    const searchPayload = {
      from: fromDate,
      to: toDate,
      yourReference1: jobNumber, // Search by Your Reference field
      customerId: "", // Empty customer ID by default
      companyIds: [], // Empty company IDs by default
      telephoneNumber: "", // Empty for general search
      capabilities: [],
      capabilityMatchType: "Any",
      exactMatch: true, // Exact match for reference
      ignorePostcode: false,
      ignoreTown: false,
      types: [
        "Active",
        "ExchangedActive", 
        "Advanced",
        "Mobile",
        "ExchangedMobile",
        "Completed",
        "ExchangedCompleted"
      ], // All active booking types, excluding cancelled
      pageSize: 100 // Large page size for comprehensive search
    };

    console.log(`📤 Search payload:`, searchPayload);
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Autocab search failed: ${response.status} - ${errorText}`);
      return { exists: false };
    }

    const searchResults = await response.json();
    console.log(`📋 Search results for ${jobNumber}:`, JSON.stringify(searchResults, null, 2));

    // Check if any bookings match our job number
    if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
      // Find booking that matches our job number exactly
      const matchingBooking = searchResults.find((booking: any) => {
        const ref1 = booking.yourReferences?.yourReference1 || booking.yourReference1;
        return ref1 === jobNumber;
      });

      if (matchingBooking) {
        console.log(`✅ FOUND EXISTING BOOKING: Job ${jobNumber} -> Booking ID ${matchingBooking.bookingId}`);
        return {
          exists: true,
          bookingId: matchingBooking.bookingId.toString(),
          bookingDetails: matchingBooking
        };
      }
    }

    // Also check if searchResults is a single object (not array)
    if (searchResults && !Array.isArray(searchResults) && searchResults.bookingId) {
      const ref1 = searchResults.yourReferences?.yourReference1 || searchResults.yourReference1;
      if (ref1 === jobNumber) {
        console.log(`✅ FOUND EXISTING BOOKING: Job ${jobNumber} -> Booking ID ${searchResults.bookingId}`);
        return {
          exists: true,
          bookingId: searchResults.bookingId.toString(),
          bookingDetails: searchResults
        };
      }
    }

    console.log(`ℹ️ No existing booking found for job ${jobNumber} in Autocab`);
    return { exists: false };

  } catch (error) {
    console.error('❌ Error searching Autocab for job number:', error);
    return { exists: false };
  }
}

/**
 * Get booking details from Autocab by booking ID
 */
export async function getAutocabBookingDetails(bookingId: string): Promise<any> {
  try {
    const apiKey = process.env.AUTOCAB_API_KEY;
    if (!apiKey) {
      console.error('❌ AUTOCAB_API_KEY not found');
      return null;
    }

    const response = await fetch(`https://autocab-api.azure-api.net/booking/v1/${bookingId}`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to get booking details: ${response.status}`);
      return null;
    }

    const bookingDetails = await response.json();
    console.log(`📋 Retrieved booking details for ${bookingId}`);
    return bookingDetails;

  } catch (error) {
    console.error('❌ Error getting booking details:', error);
    return null;
  }
}