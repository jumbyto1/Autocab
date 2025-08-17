// Script pentru corectarea condițiilor GRAY - eliminarea 'clear'
const fs = require('fs');

// Citim fișierul
const filePath = './server/services/authentic-vehicles.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Înlocuim condiția care face vehiculele Available să fie gri
const updatedContent = content.replace(
  /\|\| status\.includes\('clear'\)/g,
  ''
);

// Salvăm fișierul actualizat
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('✅ Fixed GRAY status logic - removed clear condition');
console.log('🎯 Available vehicles will now show GREEN instead of GRAY');