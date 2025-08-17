// Simple vehicle implementation for testing with synthetic ONLINE vehicles
export async function getSimpleVehicles(): Promise<{ success: boolean, vehicles: any[] }> {
  console.log('🚀 SIMPLE VEHICLES: Creating test vehicles for map display');

  // Canterbury coordinates
  const coords = [
    { lat: 51.2802, lng: 1.0789 }, // Canterbury center
    { lat: 51.2845, lng: 1.0654 }, // North Canterbury  
    { lat: 51.2759, lng: 1.0912 }, // East Canterbury
    { lat: 51.2734, lng: 1.0701 }, // South Canterbury
    { lat: 51.2891, lng: 1.0743 }  // West Canterbury
  ];

  // Create 5 test vehicles that are ONLINE
  const testVehicles = [
    { callsign: '57', status: 'Available', color: 'green' },
    { callsign: '45', status: 'In Job', color: 'red' },
    { callsign: '209', status: 'Available', color: 'green' },
    { callsign: '201', status: 'Going to Client', color: 'yellow' },
    { callsign: '301', status: 'Available', color: 'green' }
  ].map((vehicle, index) => ({
    id: vehicle.callsign,
    callsign: vehicle.callsign,
    make: 'Toyota',
    model: 'Prius',
    registration: `TEST${vehicle.callsign}`,
    status: vehicle.status,
    statusColor: vehicle.color,
    coordinates: coords[index],
    isOnline: true,
    vehicleName: `Vehicle ${vehicle.callsign}`
  }));

  console.log(`✅ CREATED ${testVehicles.length} test vehicles for map display`);
  console.log(`🎯 VEHICLES: ${testVehicles.map(v => v.callsign).join(', ')}`);

  return {
    success: true,
    vehicles: testVehicles
  };
}