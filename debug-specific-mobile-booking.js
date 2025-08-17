/**
 * Test Global Search cu date extinse pentru a găsi booking 384781
 * Să testez cu diferite date pentru a găsi booking-ul Mobile cu £53.60
 */

console.log('🔍 TESTING Global Search with extended dates for booking 384781');

const testGlobalSearchExtended = async () => {
  try {
    // Test cu diferite intervale de date
    const testDates = [
      { name: 'Today', days: 0 },
      { name: '7 days ago', days: 7 },
      { name: '14 days ago', days: 14 },
      { name: '30 days ago', days: 30 }
    ];
    
    for (const testDate of testDates) {
      console.log(`\n📅 Testing Global Search - ${testDate.name}:`);
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - testDate.days);
      const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log(`  Date: ${dateStr}`);
      
      const globalSearchUrl = `http://localhost:5000/api/autocab/unassigned-bookings?date=${dateStr}`;
      
      const response = await fetch(globalSearchUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  📊 Found ${data.bookings?.length || 0} bookings`);
        
        if (data.bookings && data.bookings.length > 0) {
          // Caută booking 384781
          const booking384781 = data.bookings.find(b => 
            b.bookingId === '384781' || 
            b.bookingId === 384781 ||
            b.id === '384781' ||
            b.id === 384781
          );
          
          if (booking384781) {
            console.log(`  ✅ FOUND booking 384781 in ${testDate.name}!`);
            console.log(`    Price: £${booking384781.price || booking384781.pricing?.price}`);
            console.log(`    Status: ${booking384781.status || booking384781.bookingStatus}`);
            console.log(`    Source: ${booking384781.source || booking384781.bookingSource}`);
            return; // Stop searching once found
          }
          
          // Caută booking cu £53.60
          const priceMatch = data.bookings.find(b => 
            (b.price === 53.60 || b.price === '53.60') ||
            (b.pricing?.price === 53.60 || b.pricing?.price === '53.60')
          );
          
          if (priceMatch) {
            console.log(`  💰 Found £53.60 booking in ${testDate.name}:`);
            console.log(`    Booking ID: ${priceMatch.bookingId || priceMatch.id}`);
            console.log(`    Status: ${priceMatch.status || priceMatch.bookingStatus}`);
            console.log(`    Source: ${priceMatch.source || priceMatch.bookingSource}`);
          }
          
          // Show sample bookings
          console.log(`  📋 Sample bookings:`);
          data.bookings.slice(0, 3).forEach((booking, index) => {
            console.log(`    ${index + 1}. ID: ${booking.bookingId || booking.id || 'undefined'} - £${booking.price || booking.pricing?.price || 'N/A'} - ${booking.source || booking.bookingSource || 'N/A'}`);
          });
          
        } else {
          console.log(`  ❌ No bookings found for ${testDate.name}`);
        }
        
      } else {
        console.log(`  ❌ Failed to call Global Search for ${testDate.name}: ${response.status}`);
      }
    }
    
    // Direct AUTOCAB API test with extended dates
    console.log('\n📡 DIRECT AUTOCAB API TEST with extended dates:');
    
    for (const testDate of testDates) {
      console.log(`\n📅 AUTOCAB API - ${testDate.name}:`);
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - testDate.days);
      
      const fromDate = new Date(targetDate);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(targetDate);
      toDate.setHours(23, 59, 59, 999);
      
      const autocabPayload = {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        bookingTypes: ['Active', 'Advanced', 'Mobile', 'Dispatched', 'Completed', 'Cancelled'],
        pageSize: 200,
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
        const bookings = autocabData.bookings || [];
        console.log(`  📊 AUTOCAB API returned ${bookings.length} bookings`);
        
        // Look for booking 384781
        const booking384781 = bookings.find(b => 
          b.bookingId === '384781' || b.bookingId === 384781
        );
        
        if (booking384781) {
          console.log(`  ✅ FOUND booking 384781 in AUTOCAB API - ${testDate.name}!`);
          console.log(`    Status: ${booking384781.bookingStatus}`);
          console.log(`    Price: £${booking384781.pricing?.price}`);
          console.log(`    Source: ${booking384781.bookingSource}`);
          console.log(`    Vehicle: ${booking384781.vehicle?.callsign || booking384781.vehicle?.registration}`);
          console.log(`    Full booking data:`);
          console.log(JSON.stringify(booking384781, null, 2));
          return; // Stop once found
        }
        
        // Look for £53.60 price
        const priceMatch = bookings.find(b => 
          b.pricing?.price === 53.60 || b.pricing?.price === '53.60'
        );
        
        if (priceMatch) {
          console.log(`  💰 Found £53.60 in AUTOCAB API - ${testDate.name}:`);
          console.log(`    Booking ID: ${priceMatch.bookingId}`);
          console.log(`    Status: ${priceMatch.bookingStatus}`);
          console.log(`    Source: ${priceMatch.bookingSource}`);
        }
        
      } else {
        console.log(`  ❌ AUTOCAB API failed for ${testDate.name}: ${autocabResponse.status}`);
      }
    }
    
  } catch (error) {
    console.log('\n❌ TEST ERROR:', error.message);
  }
};

testGlobalSearchExtended();