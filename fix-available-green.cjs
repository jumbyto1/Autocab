// Script pentru adăugarea verificării explicite Available = GREEN
const fs = require('fs');

// Citim fișierul
const filePath = './server/services/authentic-vehicles.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Înlocuim pentru a adăuga verificarea explicită pentru Available
const updatedContent = content.replace(
  /\/\/ RED: Busy states \(on job, meter on, dispatched\)\s*if \(status\.includes\('busy'\)/g,
  `// GREEN: Available status (explicit check first)
        if (status.includes('available')) {
          statusColor = 'green';
        }
        // RED: Busy states (on job, meter on, dispatched)
        else if (status.includes('busy')`
);

// Salvăm fișierul actualizat
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('✅ Added explicit Available = GREEN check');
console.log('🎯 Available vehicles will now explicitly show GREEN');