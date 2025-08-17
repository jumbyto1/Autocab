/**
 * Verifică în Search V2 toate booking types pentru Mobile/App bookings
 * Să căutăm orice Mobile bookings sau App bookings complete care ar putea lipsi
 */

console.log('🔍 DEBUGGING Search V2 for Mobile/App Bookings');

const debugSearchV2Mobile = async () => {
  try {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Lista completă de booking types din AUTOCAB API
    const allBookingTypes = [
      'Mobile', 'Active', 'Advanced', 'Dispatched', 'Completed', 
      'Cancelled', 'Recovered', 'NoJob', 'Skipped', 'Suspended',
      'ExchangedActive', 'ExchangedMobile', 'ExchangedCompleted', 
      'ExchangedCancelled', 'ExchangedNoJob'
    ];
    
    console.log('\n📡 1. Searching ALL booking types for Mobile-related bookings...');
    
    const searchPayload = {
      from: todayStart.toISOString(),
      to: today.toISOString(),
      bookingTypes: allBookingTypes,
      pageSize: 200,
      pageNumber: 1
    };
    
    const searchResponse = await fetch('https://autocab-api.azure-api.net/booking/v1/1.2/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY || ''
      },
      body: JSON.stringify(searchPayload)
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const bookings = searchData.bookings || [];
      
      console.log(`\n📊 Found ${bookings.length} total bookings today`);
      
      // Analizează toate booking statuses
      const statusCounts = {};
      bookings.forEach(booking => {
        const status = booking.bookingStatus || 'UNDEFINED';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('\n📋 Booking Status Distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} bookings`);
      });
      
      // Filtrează Mobile bookings
      const mobileBookings = bookings.filter(b => 
        b.bookingStatus === 'Mobile' || 
        b.bookingStatus === 'ExchangedMobile' ||
        (b.bookingStatus && b.bookingStatus.toLowerCase().includes('mobile'))
      );
      
      console.log(`\n📱 Found ${mobileBookings.length} Mobile-related bookings:`);
      mobileBookings.forEach((booking, index) => {
        console.log(`\n--- Mobile Booking #${index + 1} ---`);
        console.log(`  Booking ID: ${booking.bookingId || 'UNDEFINED'}`);
        console.log(`  Status: ${booking.bookingStatus}`);
        console.log(`  Price: £${booking.pricing?.price || 'N/A'}`);
        console.log(`  Date: ${booking.when || 'N/A'}`);
        console.log(`  Vehicle: ${booking.vehicle?.callsign || booking.vehicle?.registration || 'N/A'}`);
        console.log(`  Driver: ${booking.driver?.name || 'N/A'}`);
        console.log(`  Customer: ${booking.customer?.name || 'N/A'}`);
        console.log(`  Pickup: ${booking.pickupAddress || 'N/A'}`);
        console.log(`  Destination: ${booking.destinationAddress || 'N/A'}`);
        console.log(`  Vehicle Constraints: ${JSON.stringify(booking.vehicleConstraints)}`);
        console.log(`  Driver Constraints: ${JSON.stringify(booking.driverConstraints)}`);
      });
      
      // Caută bookings cu app-related keywords
      const appBookings = bookings.filter(b => {
        const searchText = JSON.stringify(b).toLowerCase();
        return searchText.includes('app') || 
               searchText.includes('mobile') ||
               searchText.includes('smartphone') ||
               searchText.includes('application');
      });
      
      console.log(`\n📱 Found ${appBookings.length} App-related bookings (by keyword search):`);
      appBookings.slice(0, 5).forEach((booking, index) => {
        console.log(`\n--- App Booking #${index + 1} ---`);
        console.log(`  Booking ID: ${booking.bookingId || 'UNDEFINED'}`);
        console.log(`  Status: ${booking.bookingStatus}`);
        console.log(`  Price: £${booking.pricing?.price || 'N/A'}`);
        console.log(`  Vehicle: ${booking.vehicle?.callsign || 'N/A'}`);
        console.log(`  Notes: ${booking.notes || 'N/A'}`);
        console.log(`  Booking Source: ${booking.bookingSource || 'N/A'}`);
        console.log(`  Channel: ${booking.channel || 'N/A'}`);
      });
      
      // Caută Completed bookings care ar putea fi Mobile jobs finalizate
      const completedBookings = bookings.filter(b => b.bookingStatus === 'Completed');
      console.log(`\n✅ Found ${completedBookings.length} Completed bookings (potential finalized Mobile jobs)`);
      
      // Caută toate vehiculele menționate în bookings
      const vehiclesMentioned = new Set();
      bookings.forEach(booking => {
        if (booking.vehicle?.callsign) vehiclesMentioned.add(booking.vehicle.callsign);
        if (booking.vehicle?.registration) vehiclesMentioned.add(booking.vehicle.registration);
      });
      
      console.log(`\n🚗 Vehicles mentioned in bookings: ${Array.from(vehiclesMentioned).sort().join(', ')}`);
      
      // Specific check pentru Vehicle 301
      const vehicle301Bookings = bookings.filter(b => 
        b.vehicle?.callsign === '301' || 
        b.vehicle?.registration === '301' ||
        (b.vehicleConstraints?.requestedVehicles && b.vehicleConstraints.requestedVehicles.includes(301))
      );
      
      console.log(`\n🚗 Found ${vehicle301Bookings.length} bookings for Vehicle 301:`);
      vehicle301Bookings.forEach((booking, index) => {
        console.log(`\n--- Vehicle 301 Booking #${index + 1} ---`);
        console.log(`  Booking ID: ${booking.bookingId || 'UNDEFINED'}`);
        console.log(`  Status: ${booking.bookingStatus}`);
        console.log(`  Price: £${booking.pricing?.price || 'N/A'}`);
        console.log(`  Assignment Type: ${booking.vehicle ? 'Direct Assignment' : 'Constraint Assignment'}`);
        console.log(`  Vehicle Constraints: ${JSON.stringify(booking.vehicleConstraints)}`);
      });
      
      // Final summary
      console.log('\n📊 SUMMARY:');
      console.log(`  Total bookings: ${bookings.length}`);
      console.log(`  Mobile bookings: ${mobileBookings.length}`);
      console.log(`  App-related bookings: ${appBookings.length}`);
      console.log(`  Completed bookings: ${completedBookings.length}`);
      console.log(`  Vehicle 301 bookings: ${vehicle301Bookings.length}`);
      console.log(`  Vehicles with bookings: ${vehiclesMentioned.size}`);
      
    } else {
      console.log('\n❌ Failed to search for bookings');
      console.log(`Status: ${searchResponse.status}`);
      console.log(`Status Text: ${searchResponse.statusText}`);
    }
    
  } catch (error) {
    console.log('\n❌ DEBUG ERROR:', error.message);
  }
};

debugSearchV2Mobile();