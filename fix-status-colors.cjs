// Script pentru înlocuirea corectă a logicii statusColor
const fs = require('fs');

// Citim fișierul
const filePath = './server/services/authentic-vehicles.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Înlocuim toate aparițiile problemei
const updatedContent = content.replace(
  /\|\| statusData\?\.hasANoJob === false/g,
  ''
);

// Salvăm fișierul actualizat
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('✅ Fixed statusColor logic - removed hasANoJob === false condition');
console.log('🎯 All Available vehicles will now show GREEN instead of RED');