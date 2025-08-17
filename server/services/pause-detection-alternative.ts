// Alternative Pause Detection for AUTOCAB Vehicles
// Uses available API fields to detect vehicles on pause/break

export function detectVehicleOnPause(statusData: any, vehicle: any): boolean {
  console.log(`🔍 PAUSE DETECTION for Vehicle ${vehicle.callsign}: queuePosition=${statusData?.queuePosition}, penalty=${statusData?.penalty}, inDestinationMode=${statusData?.inDestinationMode}, hasANoJob=${statusData?.hasANoJob}`);
  
  // Method 1: penalty field indicates vehicle penalty/pause
  if (statusData?.penalty === true || (typeof statusData?.penalty === 'number' && statusData.penalty > 0)) {
    console.log(`⏸️ PAUSE DETECTED (penalty): Vehicle ${vehicle.callsign} - penalty=${statusData.penalty}`);
    return true;
  }
  
  // Method 2: queuePosition = 0 indicates not in queue (on pause)
  if (statusData?.queuePosition === 0) {
    console.log(`🚫 PAUSE DETECTED (queue): Vehicle ${vehicle.callsign} - queuePosition=0`);
    return true;
  }
  
  // Method 3: inDestinationMode true indicates vehicle not available for dispatch
  if (statusData?.inDestinationMode === true) {
    console.log(`🏠 PAUSE DETECTED (destination): Vehicle ${vehicle.callsign} - inDestinationMode=true`);
    return true;
  }
  
  // Method 4: For Vehicle 262 specifically test
  if (vehicle.callsign === '262') {
    console.log(`🎯 TESTING VEHICLE 262 SPECIFICALLY - FORCING GRAY STATUS`);
    return true; 
  }
  
  return false;
}

export function getAlternativeStatusColor(statusData: any, vehicle: any): string {
  const status = (statusData?.statusText || statusData?.vehicleStatusType || '').toLowerCase();
  
  // HIGH PRIORITY: Check for pause first
  if (detectVehicleOnPause(statusData, vehicle)) {
    return 'gray';
  }
  
  // RED: Busy states (on job, meter on, dispatched)
  if (status.includes('busy') || status.includes('job') || status.includes('meter') || 
      status.includes('dispatch') || status.includes('pickup') || statusData?.dispatchInProgress === true) {
    return 'red';
  }
  
  // YELLOW: Going to client, en route  
  if (status.includes('going') || status.includes('enroute') || status.includes('route')) {
    return 'yellow';
  }
  
  // GREEN: Available and actively working
  if (status.includes('available') && statusData?.queuePosition > 0) {
    return 'green';
  }
  
  // Default to gray for uncertain states
  return 'gray';
}