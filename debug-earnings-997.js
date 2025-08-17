/**
 * Script pentru debugging earnings Vehicle 997 - Tahir Khan
 * Problema: Multi-day shift (început ieri dar activ azi) trebuie să afișeze today's earnings
 */

console.log('🎯 DEBUGGING VEHICLE 997 EARNINGS AFTER MULTI-DAY SHIFT FIX');
console.log('📋 Expected: Shift started 2025-07-26 but still active 2025-07-27');
console.log('📋 Goal: Show TODAY\'S earnings even for multi-day shifts');

const debugEarnings997 = async () => {
  try {
    console.log('\n📡 Testing Vehicle 997 today-stats after multi-day fix...');
    
    const response = await fetch('http://localhost:5000/api/vehicles/997/today-stats');
    const data = await response.json();
    
    console.log('\n📊 API RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      const stats = data.todayStats;
      const earnings = stats.realEarnings;
      
      console.log('\n💰 EARNINGS SUMMARY:');
      console.log(`  Cash Total: ${earnings.cashTotal}`);
      console.log(`  Account Total: ${earnings.accountTotal}`);
      console.log(`  Rank Total: ${earnings.rankTotal}`);
      console.log(`  Total Earnings: ${earnings.totalEarnings}`);
      
      console.log('\n📊 JOB STATISTICS:');
      console.log(`  Today Hours: ${stats.todayHours}`);
      console.log(`  Today Jobs: ${stats.todayJobs}`);
      console.log(`  Cash Jobs: ${stats.totalCashJobs}`);
      console.log(`  Account Jobs: ${stats.totalAccountJobs}`);
      console.log(`  Rank Jobs: ${stats.rankJobs}`);
      
      // Check if multi-day shift fix worked
      const hasEarnings = Object.values(earnings).some(val => val !== '£0.00');
      const hasJobs = stats.todayJobs > 0 || stats.todayHours > 0;
      
      if (hasEarnings || hasJobs) {
        console.log('\n✅ SUCCESS: Multi-day shift fix worked! Found actual data.');
      } else {
        console.log('\n❌ STILL ZERO: Multi-day shift accepted but AUTOCAB returns empty data.');
        console.log('🔍 Next investigation needed:');
        console.log('   1. Check if shiftId (110000) exists in AUTOCAB');
        console.log('   2. Verify shift.cashTotalCurrency field structure');
        console.log('   3. Check if shift has completed bookings today');
        console.log('   4. Investigate AUTOCAB API data structure changes');
      }
    } else {
      console.log('\n❌ API ERROR:', data.error);
    }
    
  } catch (error) {
    console.log('\n❌ FETCH ERROR:', error.message);
  }
};

debugEarnings997();