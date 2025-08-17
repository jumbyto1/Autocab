// Fix pentru statusColor - eliminarea hasANoJob === false
// Linia 365 din authentic-vehicles.ts

// OLD:
// if (status.includes('busy') || status.includes('job') || status.includes('meter') || 
//     status.includes('dispatch') || status.includes('pickup') || statusData?.hasANoJob === false) {

// NEW:
// if (status.includes('busy') || status.includes('job') || status.includes('meter') || 
//     status.includes('dispatch') || status.includes('pickup')) {