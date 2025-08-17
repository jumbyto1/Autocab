/**
 * AUTOCAB LOOKUP SERVICE - DUPLICATE DETECTION & SEARCH
 * 
 * This service provides functions to search for existing bookings in the AUTOCAB system
 * to prevent duplicate creation and enable automatic editing of existing bookings.
 */

const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;
const AUTOCAB_BASE_URL = 'https://autocab-api.azure-api.net';

/**
 * Search for existing booking by job number in AUTOCAB system
 * @param {string} jobNumber - The job number to search for
 * @returns {Promise<{exists: boolean, bookingId?: string, bookingDetails?: object}>}
 */
async function searchAutocabByJobNumber(jobNumber) {
  console.log(`🔍 AUTOCAB LOOKUP: Searching for job number ${jobNumber}`);
  
  try {
    // Use the search-bookings-v2 endpoint to find existing bookings
    const searchUrl = `${AUTOCAB_BASE_URL}/booking/v2/search-bookings-v2`;
    
    // Search parameters - looking for job number in yourReference1 field
    const searchParams = {
      yourReference1: jobNumber,
      maxResults: 10,
      includeCompleted: false, // Only search active bookings
      includeCancelled: false  // Exclude cancelled bookings
    };
    
    console.log(`🔍 AUTOCAB SEARCH PARAMS:`, searchParams);
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY
      },
      body: JSON.stringify(searchParams)
    });
    
    if (!response.ok) {
      console.log(`❌ AUTOCAB SEARCH FAILED: ${response.status} ${response.statusText}`);
      return { exists: false, error: `Search failed: ${response.statusText}` };
    }
    
    const data = await response.json();
    console.log(`📋 AUTOCAB SEARCH RESPONSE:`, JSON.stringify(data, null, 2));
    
    // Check if any bookings were found
    if (data.bookings && data.bookings.length > 0) {
      const booking = data.bookings[0]; // Take the first matching booking
      console.log(`✅ FOUND EXISTING BOOKING: ID ${booking.id} for job ${jobNumber}`);
      
      return {
        exists: true,
        bookingId: booking.id.toString(),
        bookingDetails: {
          id: booking.id,
          status: booking.status,
          pickup: booking.pickupLocation?.address || 'N/A',
          destination: booking.destinationLocation?.address || 'N/A',
          customerName: booking.customerName || 'N/A',
          dateTime: booking.dateTime || 'N/A',
          yourReference1: booking.yourReference1,
          yourReference2: booking.yourReference2
        }
      };
    } else {
      console.log(`❌ NO EXISTING BOOKING FOUND for job ${jobNumber}`);
      return { exists: false };
    }
    
  } catch (error) {
    console.error(`❌ AUTOCAB LOOKUP ERROR:`, error);
    return { 
      exists: false, 
      error: error.message 
    };
  }
}

/**
 * Search for existing bookings by customer phone number
 * @param {string} phoneNumber - The phone number to search for
 * @returns {Promise<{exists: boolean, bookings?: Array}>}
 */
async function searchAutocabByPhone(phoneNumber) {
  console.log(`🔍 AUTOCAB PHONE LOOKUP: Searching for phone ${phoneNumber}`);
  
  try {
    const searchUrl = `${AUTOCAB_BASE_URL}/booking/v2/search-bookings-v2`;
    
    const searchParams = {
      customerPhone: phoneNumber,
      maxResults: 5,
      includeCompleted: false,
      includeCancelled: false
    };
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY
      },
      body: JSON.stringify(searchParams)
    });
    
    if (!response.ok) {
      return { exists: false, error: `Phone search failed: ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (data.bookings && data.bookings.length > 0) {
      return {
        exists: true,
        bookings: data.bookings.map(booking => ({
          id: booking.id,
          status: booking.status,
          customerName: booking.customerName,
          pickup: booking.pickupLocation?.address,
          destination: booking.destinationLocation?.address,
          dateTime: booking.dateTime
        }))
      };
    }
    
    return { exists: false };
    
  } catch (error) {
    console.error(`❌ AUTOCAB PHONE LOOKUP ERROR:`, error);
    return { exists: false, error: error.message };
  }
}

/**
 * Get detailed booking information by booking ID
 * @param {string} bookingId - The booking ID to retrieve
 * @returns {Promise<{success: boolean, booking?: object}>}
 */
async function getAutocabBookingDetails(bookingId) {
  console.log(`🔍 AUTOCAB BOOKING DETAILS: Getting booking ${bookingId}`);
  
  try {
    const detailUrl = `${AUTOCAB_BASE_URL}/booking/v1/booking/${bookingId}`;
    
    const response = await fetch(detailUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `Failed to get booking details: ${response.statusText}` };
    }
    
    const booking = await response.json();
    console.log(`✅ RETRIEVED BOOKING DETAILS: ${bookingId}`);
    
    return {
      success: true,
      booking: booking
    };
    
  } catch (error) {
    console.error(`❌ AUTOCAB BOOKING DETAILS ERROR:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a booking exists and is still active
 * @param {string} bookingId - The booking ID to check
 * @returns {Promise<{exists: boolean, isActive?: boolean}>}
 */
async function checkBookingExists(bookingId) {
  const result = await getAutocabBookingDetails(bookingId);
  
  if (result.success) {
    const isActive = result.booking.status !== 'Cancelled' && result.booking.status !== 'Completed';
    return {
      exists: true,
      isActive: isActive,
      status: result.booking.status
    };
  }
  
  return { exists: false };
}

export {
  searchAutocabByJobNumber,
  searchAutocabByPhone,
  getAutocabBookingDetails,
  checkBookingExists
};