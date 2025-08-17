/**
 * Debug pentru problema Mobile bookings care nu se adaugă la total
 * Din imaginile user-ului: Vehicle 301 cu booking Mobile £9.50 care nu apare în earnings
 */

console.log('🔍 DEBUGGING Mobile Bookings Integration Issue');

const debugMobileBookings = async () => {
  try {
    console.log('\n📡 1. Testing Vehicle 301 today-stats...');
    
    const vehicle301Response = await fetch('http://localhost:5000/api/vehicles/301/today-stats');
    const vehicle301Data = await vehicle301Response.json();
    
    console.log('\n📊 Vehicle 301 Today Stats:');
    console.log(JSON.stringify(vehicle301Data, null, 2));
    
    console.log('\n📡 2. Testing Global Search for booking 384779...');
    
    const globalSearchResponse = await fetch('http://localhost:5000/api/autocab/unassigned-bookings');
    const globalSearchData = await globalSearchResponse.json();
    
    if (globalSearchData.success && globalSearchData.bookings) {
      const booking384779 = globalSearchData.bookings.find(b => b.bookingId === '384779');
      
      if (booking384779) {
        console.log('\n✅ Found booking 384779 in Global Search:');
        console.log(`  - Source: ${booking384779.source || 'N/A'}`);
        console.log(`  - Status: ${booking384779.status || 'N/A'}`);
        console.log(`  - Price: £${booking384779.price || 'N/A'}`);
        console.log(`  - Vehicle: ${booking384779.assignedVehicle || booking384779.requestedVehicle || 'N/A'}`);
        console.log(`  - Driver: ${booking384779.assignedDriver || booking384779.requestedDriver || 'N/A'}`);
      } else {
        console.log('\n❌ Booking 384779 NOT found in Global Search results');
        console.log(`Found ${globalSearchData.bookings.length} total bookings`);
      }
    }
    
    console.log('\n📡 3. Checking AUTOCAB Live Shifts for Vehicle 301...');
    
    const liveShiftsResponse = await fetch('https://autocab-api.azure-api.net/driver/v1/driverliveshifts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.AUTOCAB_API_KEY || ''
      }
    });
    
    if (liveShiftsResponse.ok) {
      const liveShifts = await liveShiftsResponse.json();
      const vehicle301Shift = liveShifts.find(shift => shift.vehicleCallsign === '301');
      
      if (vehicle301Shift) {
        console.log('\n✅ Vehicle 301 Live Shift Found:');
        console.log(`  - Driver: ${vehicle301Shift.driver?.fullName || 'N/A'}`);
        console.log(`  - Started: ${vehicle301Shift.started}`);
        console.log(`  - Cash Bookings: ${vehicle301Shift.cashBookings}`);
        console.log(`  - Account Bookings: ${vehicle301Shift.accountBookings}`);
        console.log(`  - Cash Total: £${vehicle301Shift.cashBookingsTotal}`);
        console.log(`  - Account Total: £${vehicle301Shift.accountBookingsTotal}`);
        console.log(`  - Total: £${vehicle301Shift.total}`);
        
        console.log('\n🔍 ANALYSIS:');
        const expectedTotal = (vehicle301Shift.cashBookingsTotal || 0) + (vehicle301Shift.accountBookingsTotal || 0);
        console.log(`  - Expected Total: £${expectedTotal.toFixed(2)}`);
        console.log(`  - Actual Total: £${vehicle301Shift.total || 0}`);
        console.log(`  - Mobile Booking Missing?: ${vehicle301Data.todayStats?.realEarnings?.totalEarnings !== '£' + vehicle301Shift.total}`);
      } else {
        console.log('\n❌ Vehicle 301 NOT found in live shifts');
      }
    } else {
      console.log('\n❌ Failed to fetch live shifts');
    }
    
    console.log('\n📡 4. Checking Search Bookings v2 for Mobile bookings...');
    
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const searchPayload = {
      from: todayStart.toISOString(),
      to: today.toISOString(),
      bookingTypes: ['Mobile', 'Active', 'Dispatched'],
      pageSize: 100,
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
      const mobileBookings = searchData.bookings?.filter(b => b.bookingStatus === 'Mobile') || [];
      
      console.log(`\n📊 Found ${mobileBookings.length} Mobile bookings today`);
      
      mobileBookings.forEach(booking => {
        console.log(`  - Booking ${booking.bookingId}: £${booking.pricing?.price || 'N/A'} (Vehicle: ${booking.vehicle?.registration || 'N/A'})`);
      });
      
      const vehicle301Mobile = mobileBookings.find(b => b.vehicle?.registration === '301' || b.vehicle?.callsign === '301');
      if (vehicle301Mobile) {
        console.log('\n✅ Found Vehicle 301 Mobile booking:', vehicle301Mobile.bookingId);
      }
    }
    
  } catch (error) {
    console.log('\n❌ DEBUG ERROR:', error.message);
  }
};

debugMobileBookings();