/**
 * TEMPORARY FIX: Advanced Queue Position Pause Detection
 * Implements user's suggestion: queuePosition > 3 indicates pause/break
 * This is a temporary solution to add proper pause detection logic
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/services/authentic-vehicles.ts');

// Read the current file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the first occurrence of the pause detection logic
const oldPattern = `        // GRAY: Break, suspended, destination mode (not available)
        else if (status.includes('break') || status.includes('suspend') || status.includes('destination') || 
                 statusData?.inDestinationMode === true  || status.includes('pause')) {
          statusColor = 'gray';
        }`;

const newPattern = `        // GRAY: Break, suspended, destination mode (not available)
        // Advanced pause detection: queuePosition > 3 indicates pause/break
        const isPauseByQueue = statusData?.queuePosition && statusData.queuePosition > 3;
        const isKnownPause = status.includes('break') || status.includes('suspend') || status.includes('destination') || 
                            statusData?.inDestinationMode === true || status.includes('pause');
        
        if (isKnownPause || isPauseByQueue) {
          statusColor = 'gray';
          
          // Enhanced logging for pause detection
          if (isPauseByQueue) {
            console.log(\`🛑 QUEUE PAUSE DETECTED: Vehicle \${vehicle.callsign} - queuePosition=\${statusData.queuePosition} > 3 indicates break/pause\`);
          }
        }`;

// Replace only the first occurrence by finding its position
const firstIndex = content.indexOf(oldPattern);
if (firstIndex !== -1) {
  const beforeFirst = content.substring(0, firstIndex);
  const afterFirst = content.substring(firstIndex + oldPattern.length);
  
  content = beforeFirst + newPattern + afterFirst;
  
  // Write the updated content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ QUEUE PAUSE DETECTION FIX APPLIED SUCCESSFULLY');
  console.log('🎯 Now testing with vehicle 900 queuePosition=3...');
  console.log('📊 Logic: queuePosition > 3 = GRAY (pause/break)');
} else {
  console.log('❌ Pattern not found - fix may have already been applied');
}