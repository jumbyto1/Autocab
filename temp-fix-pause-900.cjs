// Temporary fix to apply pause detection for vehicle 900
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/services/authentic-vehicles.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace first occurrence only
const searchStr = 'statusColor: statusColor,';
const replaceStr = 'statusColor: getCorrectStatusColor(statusData, vehicle, statusColor),';

const firstOccurrence = content.indexOf(searchStr);
if (firstOccurrence !== -1) {
  content = content.substring(0, firstOccurrence) + 
           replaceStr + 
           content.substring(firstOccurrence + searchStr.length);
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed pause detection for vehicle 900');
} else {
  console.log('❌ Could not find target string');
}