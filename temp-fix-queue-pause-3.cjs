/**
 * TEMPORARY FIX: Adjust Queue Position Pause Detection to >= 3
 * User confirmed being on pause with queuePosition: 3
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/services/authentic-vehicles.ts');

// Read the current file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the queue position logic
const oldPattern = `const isPauseByQueue = statusData?.queuePosition && statusData.queuePosition > 3;`;
const newPattern = `const isPauseByQueue = statusData?.queuePosition && statusData.queuePosition >= 3;`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  
  // Write the updated content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ QUEUE POSITION THRESHOLD UPDATED: >= 3 (was > 3)');
  console.log('🎯 Vehicle 900 with queuePosition=3 should now be GRAY');
} else {
  console.log('❌ Pattern not found - file may have changed');
}