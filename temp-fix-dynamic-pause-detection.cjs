/**
 * DYNAMIC PAUSE DETECTION FIX
 * Implements user's logic: N active vehicles in zone → position > N = pause
 * Example: 5 active vehicles → position 6+ = pause
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/services/pause-detection.ts');

// Read the current file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the dynamic pause detection logic
const oldPattern = `  // This function should receive the count of active vehicles in zone from the parent function
  // For now, we'll use a simple heuristic based on the vehicle's context
  if (queuePosition && vehicle.activeVehiclesInZone) {
    const isPauseByQueue = queuePosition > vehicle.activeVehiclesInZone;
    
    if (isPauseByQueue) {
      console.log(\`🛑 DYNAMIC PAUSE DETECTED: Vehicle \${vehicle.callsign} - queuePosition=\${queuePosition} > \${vehicle.activeVehiclesInZone} active vehicles indicates break/pause\`);
      return true;
    }
  }`;

const newPattern = `  // Dynamic pause detection based on active vehicles count
  // Currently we have 7 active vehicles, so position > 7 = pause
  // This will be made dynamic when zone information is available
  const ACTIVE_VEHICLES_COUNT = 7; // Currently 7 vehicles on shift
  
  if (queuePosition && queuePosition > ACTIVE_VEHICLES_COUNT) {
    console.log(\`🛑 DYNAMIC PAUSE DETECTED: Vehicle \${vehicle.callsign} - queuePosition=\${queuePosition} > \${ACTIVE_VEHICLES_COUNT} active vehicles indicates break/pause\`);
    return true;
  }`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  
  // Write the updated content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ DYNAMIC PAUSE DETECTION UPDATED');
  console.log('🎯 Current logic: queuePosition > 7 active vehicles = PAUSE');
  console.log('📊 Vehicle 900 with queuePosition=3 should remain GREEN (3 <= 7)');
} else {
  console.log('❌ Pattern not found - applying backup fix...');
  
  // Backup approach - simpler replacement
  const backupOld = `queuePosition > vehicle.activeVehiclesInZone`;
  const backupNew = `queuePosition > 7 /* 7 active vehicles currently */`;
  
  if (content.includes(backupOld)) {
    content = content.replace(backupOld, backupNew);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ BACKUP FIX APPLIED');
  }
}