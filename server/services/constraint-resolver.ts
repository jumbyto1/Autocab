import * as fs from 'fs';
import * as path from 'path';

// Load reverse constraint mapping - constraint ID to callsign
let constraintMapping: any = null;

function loadConstraintMapping() {
  if (constraintMapping) return constraintMapping;
  
  try {
    const mappingPath = path.join(process.cwd(), 'reverse-constraint-mapping.json');
    if (fs.existsSync(mappingPath)) {
      const mappingData = fs.readFileSync(mappingPath, 'utf-8');
      constraintMapping = JSON.parse(mappingData);
      console.log('✅ CONSTRAINT MAPPING LOADED: Driver mappings:', Object.keys(constraintMapping.constraintToCallsign || {}).length, 'Vehicle mappings:', Object.keys(constraintMapping.vehicleConstraintToCallsign || {}).length);
    } else {
      console.log('⚠️ Constraint mapping file not found, will resolve via API');
      constraintMapping = { constraintToCallsign: {}, vehicleConstraintToCallsign: {} };
    }
  } catch (error) {
    console.error('❌ Error loading constraint mapping:', error);
    constraintMapping = { constraintToCallsign: {}, vehicleConstraintToCallsign: {} };
  }
  
  return constraintMapping;
}

/**
 * Resolve constraint ID to driver callsign
 */
export function resolveDriverConstraintToCallsign(constraintId: number): string | null {
  const mapping = loadConstraintMapping();
  const driverInfo = mapping.constraintToCallsign?.[constraintId.toString()];
  
  if (driverInfo && driverInfo.type === 'driver') {
    console.log(`🎯 DRIVER CONSTRAINT RESOLVED: ${constraintId} → Driver ${driverInfo.callsign} (${driverInfo.fullName})`);
    return driverInfo.callsign;
  }
  
  console.log(`❌ DRIVER CONSTRAINT NOT FOUND: ${constraintId}`);
  return null;
}

/**
 * Resolve constraint ID to vehicle callsign
 */
export function resolveVehicleConstraintToCallsign(constraintId: number): string | null {
  const mapping = loadConstraintMapping();
  const vehicleInfo = mapping.vehicleConstraintToCallsign?.[constraintId.toString()];
  
  if (vehicleInfo && vehicleInfo.type === 'vehicle') {
    console.log(`🎯 VEHICLE CONSTRAINT RESOLVED: ${constraintId} → Vehicle ${vehicleInfo.callsign} (${vehicleInfo.registration})`);
    return vehicleInfo.callsign;
  }
  
  console.log(`❌ VEHICLE CONSTRAINT NOT FOUND: ${constraintId}`);  
  return null;
}

/**
 * Get full driver info from constraint ID
 */
export function getDriverInfoFromConstraint(constraintId: number): { callsign: string; fullName: string } | null {
  const mapping = loadConstraintMapping();
  const driverInfo = mapping.constraintToCallsign?.[constraintId.toString()];
  
  if (driverInfo && driverInfo.type === 'driver') {
    return {
      callsign: driverInfo.callsign,
      fullName: driverInfo.fullName
    };
  }
  
  return null;
}

/**
 * Get full vehicle info from constraint ID
 */
export function getVehicleInfoFromConstraint(constraintId: number): { callsign: string; registration: string } | null {
  const mapping = loadConstraintMapping();
  const vehicleInfo = mapping.vehicleConstraintToCallsign?.[constraintId.toString()];
  
  if (vehicleInfo && vehicleInfo.type === 'vehicle') {
    return {
      callsign: vehicleInfo.callsign,
      registration: vehicleInfo.registration
    };
  }
  
  return null;
}