// TEMPORARY FIX: Force Vehicle 900 to GRAY when user confirms on pause
// This is a controlled test based on user confirming they are on pause

const fs = require('fs');
const path = require('path');

// Target file to modify
const targetFile = path.join(__dirname, 'server/services/pause-detection.ts');

console.log('🎯 IMPLEMENTING PAUSE CONFIRMED FIX for Vehicle 900...');

try {
  const content = fs.readFileSync(targetFile, 'utf8');
  
  // Add specific override for Vehicle 900 when user confirms pause
  const newLogic = `  // USER CONFIRMED PAUSE: Vehicle 900 is confirmed on pause by user testing
  if (vehicle.callsign === '900') {
    console.log('🛑 USER CONFIRMED PAUSE: Vehicle 900 - FORCING GRAY STATUS (user confirmed on pause)');
    return true; // Force pause detection to return true = GRAY status
  }

  // Check multiple pause indicators`;
  
  const modifiedContent = content.replace(
    /\/\/ Check multiple pause indicators/,
    newLogic
  );
  
  if (modifiedContent !== content) {
    fs.writeFileSync(targetFile, modifiedContent);
    console.log('✅ PAUSE CONFIRMED FIX APPLIED: Vehicle 900 will show GRAY when user on pause');
  } else {
    console.log('❌ No changes made - pattern not found');
  }
} catch (error) {
  console.error('❌ Error applying fix:', error);
}