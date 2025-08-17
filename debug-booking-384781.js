/**
 * Test direct pentru booking 384781 cu £53.60 - Harry O'Malley
 * Să verific de ce nu apare în Global Search cu toate tipurile de status
 */

console.log('🔍 DIRECT BOOKING 384781 SEARCH TEST');

const testBooking384781 = async () => {
  try {
    console.log('\n📡 STEP 1: Direct AUTOCAB search for booking 384781 with ALL status types');
    
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);
    
    const searchPayload = {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      telephoneNumber: "",
      companyIds: [],
      capabilities: [],
      capabilityMatchType: "Any",
      exactMatch: false,
      ignorePostcode: true,
      ignoreTown: true,
      types: ["Active", "Advanced", "Mobile", "Dispatched", "Completed", "Cancelled", "Recovered", "NoJob", "Skipped", "Suspended", "ExchangedActive", "ExchangedMobile", "ExchangedCompleted", "ExchangedCancelled", "ExchangedNoJob"] // ALL possible statuses
    };
    
    const response = await fetch('https://autocab-api.azure-api.net/booking/v1/1.2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY || ''
      },
      body: JSON.stringify(searchPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      const bookings = data.bookings || [];
      
      console.log(`📊 AUTOCAB API returned ${bookings.length} bookings with ALL status types`);
      
      // Search for booking 384781
      const booking384781 = bookings.find(b => 
        String(b.id) === '384781' || String(b.bookingId) === '384781'
      );
      
      if (booking384781) {
        console.log('\n✅ FOUND BOOKING 384781 in extended search!');
        console.log(`Status: ${booking384781.bookingStatus || booking384781.status || booking384781.bookingType}`);
        console.log(`Price: £${booking384781.pricing?.price || booking384781.totalPrice?.amount}`);
        console.log(`Customer: ${booking384781.name || booking384781.passengerName}`);
      } else {
        console.log('\n❌ BOOKING 384781 NOT FOUND even with all status types');
        
        // Try to search by customer name Harry O'Malley
        const harryBookings = bookings.filter(b => 
          (b.name || b.passengerName || '').toLowerCase().includes('harry') ||
          (b.name || b.passengerName || '').toLowerCase().includes("o'malley")
        );
        
        console.log(`\n🔍 Found ${harryBookings.length} bookings containing 'Harry' or 'O'Malley':`);
        harryBookings.forEach(booking => {
          console.log(`  ID: ${booking.id} - ${booking.name || booking.passengerName} - £${booking.pricing?.price || booking.totalPrice?.amount || 'N/A'}`);
        });
        
        // Try to search by £53.60 price
        const priceMatches = bookings.filter(b => {
          const price = b.pricing?.price || b.totalPrice?.amount;
          return price === 53.6 || price === '53.6' || price === 53.60 || price === '53.60';
        });
        
        console.log(`\n💰 Found ${priceMatches.length} bookings with £53.60 price:`);
        priceMatches.forEach(booking => {
          console.log(`  ID: ${booking.id} - ${booking.name || booking.passengerName} - £${booking.pricing?.price || booking.totalPrice?.amount}`);
        });
      }
      
    } else {
      console.log(`\n❌ AUTOCAB API error: ${response.status}`);
    }
    
    console.log('\n📡 STEP 2: Try GET individual booking by ID');
    
    // Try direct GET booking by ID
    const directResponse = await fetch(`https://autocab-api.azure-api.net/booking/v1/${384781}`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY || ''
      }
    });
    
    if (directResponse.ok) {
      const bookingData = await directResponse.json();
      console.log('✅ DIRECT GET SUCCESS - Booking 384781 exists:');
      console.log(`ID: ${bookingData.id}`);
      console.log(`Status: ${bookingData.bookingStatus || bookingData.status}`);
      console.log(`Price: £${bookingData.pricing?.price || bookingData.totalPrice?.amount}`);
      console.log(`Customer: ${bookingData.name || bookingData.passengerName}`);
    } else {
      console.log(`❌ DIRECT GET failed: ${directResponse.status} - ${await directResponse.text()}`);
    }
    
  } catch (error) {
    console.log('❌ TEST ERROR:', error.message);
  }
};

testBooking384781();