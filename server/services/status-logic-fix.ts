// AUTOCAB Status Color Logic - Centralized Fix
// Resolves inconsistent status color assignment for vehicles

export function calculateVehicleStatusColor(statusData: any): string {
  const status = (statusData?.statusText || statusData?.vehicleStatusType || '').toLowerCase();
  
  // RED: Busy states (on job, meter on, dispatched) - HIGHEST PRIORITY
  if (status.includes('busy') || status.includes('job') || status.includes('meter') || 
      status.includes('dispatch') || status.includes('pickup')) {
    return 'red';
  }
  
  // YELLOW: Going to client, en route
  if (status.includes('going') || status.includes('enroute') || status.includes('route') || 
      statusData?.dispatchInProgress === true) {
    return 'yellow';
  }
  
  // GRAY: Available, clear, break, suspended, destination mode (not actively working)
  if (status.includes('available') || status.includes('clear') || status.includes('free') ||
      status.includes('break') || status.includes('suspend') || status.includes('destination') || 
      statusData?.inDestinationMode === true || status.includes('pause') || 
      statusData?.hasANoJob === true) {
    return 'gray';
  }
  
  // Default fallback to gray for unknown states
  return 'gray';
}