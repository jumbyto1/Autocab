// Enhanced status color logic for AUTOCAB vehicles
export function calculateStatusColor(statusData: any, vehicleCallsign: string): {color: string, text: string} {
  let statusColor = 'green';
  let statusText = 'Available';
  
  if (statusData) {
    console.log(`🔍 STATUS DEBUG ${vehicleCallsign}:`, {
      hasANoJob: statusData.hasANoJob,
      dispatchInProgress: statusData.dispatchInProgress,
      atPickup: statusData.atPickup,
      inDestinationMode: statusData.inDestinationMode,
      isSoonToClear: statusData.isSoonToClear,
      hasPrebookings: statusData.hasPrebookings
    });
    
    // RED: Vehicle is busy (has no job = false means it has a job)
    if (statusData.hasANoJob === false) {
      statusColor = 'red';
      statusText = 'In Job';
      console.log(`🔴 Vehicle ${vehicleCallsign}: IN JOB (hasANoJob=false)`);
    }
    // YELLOW: Vehicle is en route to client (dispatch in progress)
    else if (statusData.dispatchInProgress === true) {
      statusColor = 'yellow';
      statusText = 'En Route';
      console.log(`🟡 Vehicle ${vehicleCallsign}: EN ROUTE (dispatchInProgress=true)`);
    }
    // YELLOW: Vehicle is at pickup location
    else if (statusData.atPickup === true) {
      statusColor = 'yellow';
      statusText = 'At Pickup';
      console.log(`🟡 Vehicle ${vehicleCallsign}: AT PICKUP (atPickup=true)`);
    }
    // GRAY: Vehicle is in destination mode (not available for new jobs)
    else if (statusData.inDestinationMode === true) {
      statusColor = 'gray';
      statusText = 'Destination Mode';
      console.log(`⚫ Vehicle ${vehicleCallsign}: DESTINATION MODE (inDestinationMode=true)`);
    }
    // GRAY: Vehicle is soon to clear (finishing current task)
    else if (statusData.isSoonToClear === true) {
      statusColor = 'gray';
      statusText = 'Soon to Clear';
      console.log(`⚫ Vehicle ${vehicleCallsign}: SOON TO CLEAR (isSoonToClear=true)`);
    }
    // GREEN: Vehicle has pending pre-bookings but available
    else if (statusData.hasPrebookings === true) {
      statusColor = 'green';
      statusText = 'Available (Pre-booked)';
      console.log(`🟢 Vehicle ${vehicleCallsign}: AVAILABLE WITH PREBOOKINGS (hasPrebookings=true)`);
    }
    // GREEN: Vehicle has no job and is available
    else if (statusData.hasANoJob === true) {
      statusColor = 'green';
      statusText = 'Available';
      console.log(`🟢 Vehicle ${vehicleCallsign}: AVAILABLE (hasANoJob=true)`);
    }
  }
  
  return {color: statusColor, text: statusText};
}