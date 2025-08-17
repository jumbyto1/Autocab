/**
 * Verifică cum Global Search găsește booking 384781 cu £53.60
 * Să analizez endpoint-ul Global Search pentru a vedea de unde vine booking-ul
 */

console.log('🔍 DEBUGGING Global Search for Booking 384781');

const debugGlobalSearchBooking = async () => {
  try {
    console.log('\n📡 1. Calling Global Search endpoint to find booking 384781...');
    
    const globalSearchResponse = await fetch('http://localhost:5000/api/autocab/unassigned-bookings');
    
    if (globalSearchResponse.ok) {
      const globalData = await globalSearchResponse.json();
      
      console.log(`\n📊 Global Search returned ${globalData.bookings?.length || 0} bookings`);
      console.log(`Success: ${globalData.success}`);
      
      if (globalData.bookings && globalData.bookings.length > 0) {
        // Caută booking 384781
        const booking384781 = globalData.bookings.find(b => 
          b.bookingId === '384781' || 
          b.bookingId === 384781 ||
          b.id === '384781' ||
          b.id === 384781
        );
        
        if (booking384781) {
          console.log('\n✅ FOUND Booking 384781 in Global Search:');
          console.log('--- COMPLETE BOOKING DATA ---');
          console.log(JSON.stringify(booking384781, null, 2));
          
          console.log('\n--- KEY FIELDS ---');
          console.log(`  Booking ID: ${booking384781.bookingId || booking384781.id}`);
          console.log(`  Status: ${booking384781.status || booking384781.bookingStatus}`);
          console.log(`  Price: £${booking384781.price || booking384781.pricing?.price}`);
          console.log(`  Source: ${booking384781.source || booking384781.bookingSource}`);
          console.log(`  Customer: ${booking384781.customerName || booking384781.customer?.name}`);
          console.log(`  Pickup: ${booking384781.pickupAddress || booking384781.pickup?.address}`);
          console.log(`  Destination: ${booking384781.destinationAddress || booking384781.destination?.address}`);
          console.log(`  When: ${booking384781.when || booking384781.pickupTime}`);
          console.log(`  Vehicle: ${booking384781.assignedVehicle || booking384781.requestedVehicle || booking384781.vehicle?.callsign}`);
          console.log(`  Driver: ${booking384781.assignedDriver || booking384781.requestedDriver || booking384781.driver?.name}`);
          
        } else {
          console.log('\n❌ Booking 384781 NOT found in Global Search results');
          
          // Show first few bookings for debugging
          console.log('\n📋 First 5 bookings from Global Search:');
          globalData.bookings.slice(0, 5).forEach((booking, index) => {
            console.log(`  ${index + 1}. ID: ${booking.bookingId || booking.id} - Price: £${booking.price || booking.pricing?.price} - Source: ${booking.source || booking.bookingSource}`);
          });
          
          // Check if any booking has £53.60 price
          const priceMatch = globalData.bookings.find(b => 
            (b.price === 53.60 || b.price === '53.60') ||
            (b.pricing?.price === 53.60 || b.pricing?.price === '53.60')
          );
          
          if (priceMatch) {
            console.log('\n💰 Found booking with £53.60 price:');
            console.log(`  Booking ID: ${priceMatch.bookingId || priceMatch.id}`);
            console.log(`  Price: £${priceMatch.price || priceMatch.pricing?.price}`);
            console.log(`  Source: ${priceMatch.source || priceMatch.bookingSource}`);
          }
        }
        
      } else {
        console.log('\n❌ No bookings returned from Global Search');
      }
      
    } else {
      console.log('\n❌ Failed to call Global Search endpoint');
      console.log(`Status: ${globalSearchResponse.status}`);
      console.log(`Response: ${await globalSearchResponse.text()}`);
    }
    
    // Also check what the underlying AUTOCAB API call returns
    console.log('\n📡 2. Checking raw AUTOCAB API call that Global Search uses...');
    
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const autocabPayload = {
      from: todayStart.toISOString(),
      to: today.toISOString(),
      bookingTypes: ['Active', 'Advanced', 'Mobile', 'Dispatched'],
      pageSize: 100,
      pageNumber: 1
    };
    
    const autocabResponse = await fetch('https://autocab-api.azure-api.net/booking/v1/1.2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY || ''
      },
      body: JSON.stringify(autocabPayload)
    });
    
    if (autocabResponse.ok) {
      const autocabData = await autocabResponse.json();
      console.log(`\n📊 AUTOCAB API returned ${autocabData.bookings?.length || 0} bookings`);
      
      // Look for booking 384781 in raw AUTOCAB data
      const rawBooking = autocabData.bookings?.find(b => 
        b.bookingId === '384781' || b.bookingId === 384781
      );
      
      if (rawBooking) {
        console.log('\n✅ FOUND Booking 384781 in raw AUTOCAB API:');
        console.log(`  Raw Booking ID: ${rawBooking.bookingId}`);
        console.log(`  Raw Status: ${rawBooking.bookingStatus}`);
        console.log(`  Raw Price: £${rawBooking.pricing?.price}`);
        console.log(`  Raw Source: ${rawBooking.bookingSource}`);
      } else {
        console.log('\n❌ Booking 384781 NOT found in raw AUTOCAB API');
        
        // Check for £53.60 price in raw data
        const rawPriceMatch = autocabData.bookings?.find(b => 
          b.pricing?.price === 53.60 || b.pricing?.price === '53.60'
        );
        
        if (rawPriceMatch) {
          console.log('\n💰 Found £53.60 booking in raw AUTOCAB data:');
          console.log(`  Booking ID: ${rawPriceMatch.bookingId}`);
          console.log(`  Status: ${rawPriceMatch.bookingStatus}`);
          console.log(`  Source: ${rawPriceMatch.bookingSource}`);
          console.log(`  Vehicle: ${rawPriceMatch.vehicle?.callsign}`);
        }
      }
      
    } else {
      console.log('\n❌ Failed to call raw AUTOCAB API');
    }
    
  } catch (error) {
    console.log('\n❌ DEBUG ERROR:', error.message);
  }
};

debugGlobalSearchBooking();