/**
 * FIX RAPID pentru Global Search - să simplific și să fac să returneze bookings
 * Să testez direct cu AUTOCAB API să găsesc booking 384781 cu £53.60
 */

console.log('🔍 FIXING Global Search for Mobile bookings - Looking for 384781');

const fixedGlobalSearch = async () => {
  try {
    console.log('\n📡 DIRECT AUTOCAB SEARCH for today with ALL booking types:');
    
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);
    
    // Simplificat payload cu toate tipurile de booking
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
      types: ["Active", "Advanced", "Mobile", "Dispatched", "Completed", "Cancelled"] // Toate tipurile posibile
    };
    
    console.log('📋 Search payload:', JSON.stringify(searchPayload, null, 2));
    
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
      
      console.log(`📊 AUTOCAB returned ${bookings.length} bookings for today`);
      
      if (bookings.length > 0) {
        // Direct search for booking 384781
        const booking384781 = bookings.find(b => 
          String(b.bookingId) === '384781' || 
          String(b.id) === '384781'
        );
        
        if (booking384781) {
          console.log('\n✅ FOUND BOOKING 384781!');
          console.log('--- COMPLETE BOOKING DATA ---');
          console.log(JSON.stringify(booking384781, null, 2));
          
          console.log('\n--- KEY FIELDS ---');
          console.log(`ID: ${booking384781.bookingId || booking384781.id}`);
          console.log(`Status: ${booking384781.bookingStatus || booking384781.bookingType}`);
          console.log(`Source: ${booking384781.bookingSource}`);
          console.log(`Price: £${booking384781.pricing?.price || booking384781.totalPrice?.amount}`);
          console.log(`Customer: ${booking384781.passengerName || booking384781.customer?.name}`);
          console.log(`Pickup: ${booking384781.pickup?.address || booking384781.pickupAddress}`);
          console.log(`Destination: ${booking384781.destination?.address || booking384781.destinationAddress}`);
          console.log(`Vehicle: ${booking384781.vehicle?.callsign || booking384781.vehicle?.registration}`);
          console.log(`Driver: ${booking384781.driver?.name}`);
          
        } else {
          console.log('\n❌ Booking 384781 NOT found in today\'s bookings');
          
          // Look for £53.60 price to confirm it exists
          const priceMatches = bookings.filter(b => {
            const price = b.pricing?.price || b.totalPrice?.amount;
            return price === 53.60 || price === '53.60';
          });
          
          console.log(`\n💰 Found ${priceMatches.length} bookings with £53.60 price:`);
          priceMatches.forEach((booking, index) => {
            console.log(`  ${index + 1}. ID: ${booking.bookingId || booking.id || 'undefined'}`);
            console.log(`     Status: ${booking.bookingStatus || booking.bookingType}`);
            console.log(`     Source: ${booking.bookingSource}`);
            console.log(`     Customer: ${booking.passengerName || booking.customer?.name || 'N/A'}`);
            console.log(`     Price: £${booking.pricing?.price || booking.totalPrice?.amount}`);
            console.log('     ---');
          });
          
          // Show booking structure sample for debugging
          console.log('\n📋 Sample booking structure (first booking):');
          const sample = bookings[0];
          console.log('Available fields:', Object.keys(sample));
          console.log('ID field:', sample.bookingId || sample.id);
          console.log('Status field:', sample.bookingStatus || sample.bookingType);
          console.log('Price structure:', sample.pricing || sample.totalPrice);
        }
        
        // Status distribution
        const statusDistribution = bookings.reduce((acc, booking) => {
          const status = booking.bookingStatus || booking.bookingType || 'Unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        
        console.log('\n📊 Status distribution:');
        Object.entries(statusDistribution).forEach(([status, count]) => {
          console.log(`  ${status}: ${count} bookings`);
        });
        
        // Look for Mobile bookings specifically
        const mobileBookings = bookings.filter(b => 
          (b.bookingStatus || b.bookingType) === 'Mobile' ||
          (b.bookingSource || '').toLowerCase().includes('mobile')
        );
        
        console.log(`\n📱 Found ${mobileBookings.length} Mobile bookings:`);
        mobileBookings.slice(0, 5).forEach((booking, index) => {
          console.log(`  ${index + 1}. ID: ${booking.bookingId || booking.id || 'undefined'} - £${booking.pricing?.price || booking.totalPrice?.amount || 'N/A'} - ${booking.bookingSource || 'N/A'}`);
        });
        
      } else {
        console.log('\n❌ No bookings found for today');
      }
      
    } else {
      console.log(`\n❌ AUTOCAB API call failed: ${response.status}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('\n❌ SEARCH ERROR:', error.message);
  }
};

fixedGlobalSearch();