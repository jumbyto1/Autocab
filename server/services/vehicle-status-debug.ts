// Debug AUTOCAB Vehicle Status for Vehicle 262
// To understand pause/break status detection

export async function debugVehicle262Status() {
  try {
    const AUTOCAB_API_KEY = process.env.AUTOCAB_API_KEY;
    if (!AUTOCAB_API_KEY) {
      console.log('❌ AUTOCAB API key not found');
      return;
    }

    // Test multiple AUTOCAB endpoints to find pause status
    const companyIds = [1, 2, 4];
    
    for (const companyId of companyIds) {
      console.log(`\n🔍 CHECKING COMPANY ${companyId} for Vehicle 262:`);
      
      // 1. Vehicle Status
      const statusResponse = await fetch(`https://api.autocab.systems/vehicle/v1/vehiclestatuses?companyId=${companyId}`, {
        headers: { 'X-API-KEY': AUTOCAB_API_KEY }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const vehicle262Status = statusData.find((v: any) => v.id === 262 || v.vehicleId === 262);
        if (vehicle262Status) {
          console.log(`📊 Vehicle 262 Status Data:`, vehicle262Status);
        }
      }

      // 2. Driver Live Shifts
      const shiftsResponse = await fetch(`https://api.autocab.systems/driver/v1/driverliveshifts?companyId=${companyId}`, {
        headers: { 'X-API-KEY': AUTOCAB_API_KEY }
      });
      
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        const vehicle262Shift = shiftsData.find((s: any) => s.vehicleCallsign === '262');
        if (vehicle262Shift) {
          console.log(`👤 Vehicle 262 Driver Shift:`, vehicle262Shift);
        }
      }

      // 3. Vehicle Configuration
      const configResponse = await fetch(`https://api.autocab.systems/vehicle/v1/vehicles?companyId=${companyId}`, {
        headers: { 'X-API-KEY': AUTOCAB_API_KEY }
      });
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const vehicle262Config = configData.find((v: any) => v.callsign === '262');
        if (vehicle262Config) {
          console.log(`🚗 Vehicle 262 Config:`, vehicle262Config);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging vehicle 262:', error);
  }
}