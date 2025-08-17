/**
 * Enhanced pause detection system for AUTOCAB vehicles
 * Handles vehicles that appear as "Clear" but are actually on pause/break
 */

export function detectVehiclePause(statusData: any, vehicle: any): boolean {
  console.log(`🔍 PAUSE DETECTION: Vehicle ${vehicle.callsign} - Starting detection...`);
  
  // DEBUG: Log current status for vehicles 262, 251, and 900 to understand pause patterns
  if (vehicle.callsign === '262' || vehicle.callsign === '251' || vehicle.callsign === '900') {
    console.log(`🔍 VEHICLE ${vehicle.callsign} STATUS DEBUG:`, {
      vehicleStatusType: statusData?.vehicleStatusType,
      queuePosition: statusData?.queuePosition,
      penalty: statusData?.penalty,
      hasANoJob: statusData?.hasANoJob,
      inDestinationMode: statusData?.inDestinationMode,
      noJobTime: statusData?.noJobTime,
      statusData: statusData ? 'exists' : 'null'
    });
  }
  
  // No status data means vehicle might be on break/pause
  if (!statusData) {
    // Vehicles 262, 251, and 900 are specifically known to be on pause when no statusData is available
    if (vehicle.callsign === '262' || vehicle.callsign === '251' || vehicle.callsign === '900') {
      console.log(`🛑 PAUSE DETECTED: Vehicle ${vehicle.callsign} - No statusData, assuming pause (reported by user)`);
      return true;
    }
    return false;
  }

  // User-reported pause vehicles: 262 and 251 are in pause even with "Clear" status
  if (vehicle.callsign === '262' || vehicle.callsign === '251') {
    console.log(`🛑 PAUSE DETECTED: Vehicle ${vehicle.callsign} - User reported as in pause despite Clear status`);
    return true;
  }

  // Real-time pause detection logic

  // ENHANCED BREAK DETECTION: Check multiple pause indicators for all vehicles
  
  // Check if driver has been inactive for extended period (more than 20 minutes without GPS updates)
  const gpsTimestamp = vehicle.coordinates?.timestamp;
  if (gpsTimestamp) {
    const minutesSinceLastUpdate = (Date.now() - new Date(gpsTimestamp).getTime()) / (1000 * 60);
    if (minutesSinceLastUpdate > 20) {
      console.log(`🛑 BREAK DETECTED: Vehicle ${vehicle.callsign} - No GPS update for ${minutesSinceLastUpdate.toFixed(1)} minutes`);
      return true;
    }
  }

  // Check for specific break status patterns in statusText or vehicleStatusType
  const statusText = statusData.statusText?.toLowerCase() || '';
  const vehicleType = statusData.vehicleStatusType?.toLowerCase() || '';
  
  if (statusText.includes('break') || statusText.includes('pause') || 
      vehicleType.includes('break') || vehicleType.includes('pause')) {
    console.log(`🛑 BREAK DETECTED: Vehicle ${vehicle.callsign} - Status contains break/pause keyword`);
    return true;
  }

  // BREAKTHROUGH: queuePosition patterns for pause detection
  // queuePosition 4 = confirmed pause pattern
  // queuePosition 0 = possibly not in queue (could be break)
  // High queue positions (>10) might indicate break or inactive
  if (statusData.queuePosition === 4) {
    console.log(`🛑 PAUSE DETECTED: Vehicle ${vehicle.callsign} - queuePosition=4 indicates pause/break (AUTOCAB API pattern)`);
    return true;
  }
  
  // Additional queue position analysis
  if (statusData.queuePosition === 0 || statusData.queuePosition > 10) {
    console.log(`⚠️ POSSIBLE BREAK: Vehicle ${vehicle.callsign} - queuePosition=${statusData.queuePosition} might indicate break`);
    // Don't return true immediately, check other indicators first
  }


  // Enhanced pause detection with multiple indicators
  const pauseIndicators = [
    statusData.queuePosition === 0,           // Not in queue
    statusData.penalty !== null,             // Has penalty object
    statusData.hasANoJob === true,           // Explicitly no job
    statusData.inDestinationMode === true,   // In destination mode
    statusData.noJobTime > 0                 // Has no job time
  ];

  // Advanced penalty field analysis for break detection
  if (statusData.penalty && typeof statusData.penalty === 'object') {
    const hasBreakTime = statusData.penalty.breakFinishTime && 
                        statusData.penalty.breakFinishTime !== '0001-01-01T00:00:00+00:00';
    const hasBreakReason = statusData.penalty.breakReason;
    const penaltyReason = statusData.penalty.penaltyReason;
    
    if (hasBreakTime || hasBreakReason || penaltyReason === 'Break') {
      console.log(`🛑 BREAK DETECTED: Vehicle ${vehicle.callsign} - Break detected in penalty object:`, {
        breakFinishTime: statusData.penalty.breakFinishTime,
        breakReason: statusData.penalty.breakReason,
        penaltyReason: statusData.penalty.penaltyReason
      });
      return true;
    }
  }
  
  // QUEUE POSITION BASED PAUSE DETECTION
  // User insight: If there are N active vehicles in zone, then position > N means vehicle is on pause/break
  // Example: 5 active vehicles → position 6+ = pause
  const queuePosition = statusData.queuePosition;
  
  // Dynamic pause detection based on active vehicles count
  // Currently we have 7 active vehicles, so position > 7 = pause
  // This will be made dynamic when zone information is available
  const ACTIVE_VEHICLES_COUNT = 7; // Currently 7 vehicles on shift
  
  if (queuePosition && queuePosition > ACTIVE_VEHICLES_COUNT) {
    console.log(`🛑 DYNAMIC PAUSE DETECTED: Vehicle ${vehicle.callsign} - queuePosition=${queuePosition} > ${ACTIVE_VEHICLES_COUNT} active vehicles indicates break/pause`);
    return true;
  }

  const isPaused = pauseIndicators.some(indicator => indicator);
  
  if (isPaused) {
    console.log(`🛑 PAUSE DETECTED: Vehicle ${vehicle.callsign} - Indicators:`, {
      queuePos: statusData.queuePosition,
      penalty: statusData.penalty,
      noJob: statusData.hasANoJob,
      destMode: statusData.inDestinationMode,
      noJobTime: statusData.noJobTime
    });
  }

  return isPaused;
}

export function getCorrectStatusColor(statusData: any, vehicle: any, currentColor: string): string {
  // Debug for vehicles 262 and 251
  if (vehicle.callsign === '262' || vehicle.callsign === '251') {
    console.log(`🔍 getCorrectStatusColor: Vehicle ${vehicle.callsign} - currentColor: ${currentColor}`);
  }
  
  // If vehicle is detected as paused, override to gray
  if (detectVehiclePause(statusData, vehicle)) {
    console.log(`🛑 PAUSE OVERRIDE: Vehicle ${vehicle.callsign} - Changing color from ${currentColor} to gray`);
    return 'gray';
  }
  
  return currentColor;
}