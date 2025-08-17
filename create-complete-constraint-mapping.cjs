const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;

async function createCompleteConstraintMapping() {
  try {
    console.log('🎯 CREATING COMPLETE CONSTRAINT MAPPING...');
    
    const fetch = (await import('node-fetch')).default;
    
    // 1. Get all drivers from API
    console.log('📋 FETCHING ALL DRIVERS...');
    const driversResponse = await fetch('https://autocab-api.azure-api.net/driver/v1/drivers', {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!driversResponse.ok) {
      console.error(`❌ DRIVERS API ERROR: ${driversResponse.status}`);
      return;
    }

    const drivers = await driversResponse.json();
    console.log(`📋 LOADED ${drivers.length} TOTAL DRIVERS`);
    
    // 2. Get all vehicles from API  
    console.log('🚗 FETCHING ALL VEHICLES...');
    const vehiclesResponse = await fetch('https://autocab-api.azure-api.net/vehicle/v1/vehicles', {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AUTOCAB_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!vehiclesResponse.ok) {
      console.error(`❌ VEHICLES API ERROR: ${vehiclesResponse.status}`);
      return;
    }

    const vehicles = await vehiclesResponse.json();
    console.log(`🚗 LOADED ${vehicles.length} TOTAL VEHICLES`);
    
    // 3. Create driver constraint mapping
    console.log('\n🎯 DRIVER CONSTRAINT MAPPING:');
    console.log('=====================================');
    const driverMapping = {};
    
    drivers.forEach(driver => {
      if (driver.callsign && driver.id && driver.active) {
        driverMapping[driver.id] = {
          constraintId: driver.id,
          callsign: driver.callsign,
          fullName: driver.fullName,
          active: driver.active
        };
        console.log(`👤 Driver ${driver.callsign} → Constraint ID: ${driver.id} (${driver.fullName})`);
      }
    });
    
    // 4. Create vehicle constraint mapping
    console.log('\n🚗 VEHICLE CONSTRAINT MAPPING:');
    console.log('=====================================');
    const vehicleMapping = {};
    
    vehicles.forEach(vehicle => {
      if (vehicle.callsign && vehicle.id) {
        vehicleMapping[vehicle.id] = {
          constraintId: vehicle.id,
          callsign: vehicle.callsign,
          registration: vehicle.registration,
          active: vehicle.active
        };
        console.log(`🚗 Vehicle ${vehicle.callsign} → Constraint ID: ${vehicle.id} (${vehicle.registration})`);
      }
    });
    
    // 5. Save mappings to file
    const mappingData = {
      generated: new Date().toISOString(),
      drivers: driverMapping,
      vehicles: vehicleMapping,
      summary: {
        totalDrivers: Object.keys(driverMapping).length,
        totalVehicles: Object.keys(vehicleMapping).length
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('constraint-mapping-complete.json', JSON.stringify(mappingData, null, 2));
    
    console.log('\n🎯 MAPPING SUMMARY:');
    console.log('===================');
    console.log(`📋 Total Active Drivers: ${mappingData.summary.totalDrivers}`);
    console.log(`🚗 Total Vehicles: ${mappingData.summary.totalVehicles}`);
    console.log('💾 Mapping saved to: constraint-mapping-complete.json');
    
    // 6. Show specific examples you mentioned
    console.log('\n🎯 SPECIFIC EXAMPLES FROM YOUR INVESTIGATION:');
    console.log('=============================================');
    
    // Driver 301 example
    const driver301 = drivers.find(d => d.callsign === '301');
    if (driver301) {
      console.log(`👤 Driver 301 (Stefan Carjeu) → Constraint ID: ${driver301.id}`);
    }
    
    // Vehicle 507 examples  
    const vehicles507 = vehicles.filter(v => v.callsign === '507');
    vehicles507.forEach(vehicle => {
      console.log(`🚗 Vehicle 507 → Constraint ID: ${vehicle.id} (${vehicle.registration})`);
    });
    
    // Driver 507 examples
    const drivers507 = drivers.filter(d => d.callsign === '507');
    drivers507.forEach(driver => {
      console.log(`👤 Driver 507 (${driver.fullName}) → Constraint ID: ${driver.id}`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

createCompleteConstraintMapping();
