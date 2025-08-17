const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;

// Test direct cu Live Shifts API pentru a extrage constraint-ul pentru Driver 301
async function debugDriver301Constraint() {
  try {
    console.log('🔍 DEBUGGING DRIVER 301 CONSTRAINT...');
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://autocab-api.azure-api.net/driver/v1/liveshifts', {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ API ERROR: ${response.status}`);
      return;
    }

    const shifts = await response.json();
    console.log(`📋 TOTAL LIVE SHIFTS: ${shifts.length}`);
    
    // Caută specific Driver 301
    const driver301 = shifts.find(shift => shift.driverCallsign === "301");
    
    if (driver301) {
      console.log('🎯 FOUND DRIVER 301:');
      console.log(JSON.stringify(driver301, null, 2));
      console.log(`\n🔑 DRIVER 301 INTERNAL CONSTRAINT/ID: ${driver301.driverId}`);
      console.log(`📞 DRIVER 301 CALLSIGN: ${driver301.driverCallsign}`);
      console.log(`👤 DRIVER 301 NAME: ${driver301.driverName}`);
    } else {
      console.log('❌ DRIVER 301 NOT FOUND IN LIVE SHIFTS');
    }
    
    // Arată și Driver 235 pentru comparație
    const driver235 = shifts.find(shift => shift.driverId === 235);
    if (driver235) {
      console.log(`\n🔍 ALSO FOUND Driver ID 235: ${driver235.driverCallsign} (${driver235.driverName})`);
    } else {
      console.log(`\n❌ Driver ID 235 NOT FOUND in live shifts`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

debugDriver301Constraint();
