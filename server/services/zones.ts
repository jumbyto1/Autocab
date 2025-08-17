import fs from 'fs';
import path from 'path';

export interface Zone {
  name: string;
  descriptor: string;
  id: string;
  active: boolean;
}

let zones: Zone[] = [];

// Load zones from CSV file
export function loadZones(): Zone[] {
  if (zones.length > 0) {
    return zones;
  }

  try {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'ZONE(1)_1751362942835.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n');
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (basic CSV parsing)
      const columns = line.split('","');
      if (columns.length >= 4) {
        const name = columns[0].replace(/^"/, '').replace(/"$/, '');
        const descriptor = columns[1].replace(/^"/, '').replace(/"$/, '');
        const id = columns[2].replace(/^"/, '').replace(/"$/, '');
        const active = columns[6].replace(/^"/, '').replace(/"$/, '') === 'true';
        
        if (active && name && descriptor) {
          zones.push({
            name,
            descriptor,
            id,
            active
          });
        }
      }
    }
    
    console.log(`🗺️ Loaded ${zones.length} active zones from CSV`);
    return zones;
  } catch (error) {
    console.error('Error loading zones:', error);
    // Fallback zones
    return [
      { name: 'TOP', descriptor: 'TOP', id: '1', active: true },
      { name: 'MARGATE', descriptor: 'MARG', id: '143', active: true },
      { name: 'PORT OF DOVER', descriptor: 'DPORT', id: '155', active: true },
      { name: 'CANTERBURY', descriptor: 'CANT', id: '1', active: true }
    ];
  }
}

// Search zones by name or descriptor
export function searchZones(query: string): Zone[] {
  if (!query || query.length < 1) {
    return zones.slice(0, 10); // Return first 10 zones
  }
  
  const searchTerm = query.toLowerCase();
  return zones.filter(zone => 
    zone.name.toLowerCase().includes(searchTerm) ||
    zone.descriptor.toLowerCase().includes(searchTerm)
  ).slice(0, 20); // Limit to 20 results
}

// Get zone by descriptor
export function getZoneByDescriptor(descriptor: string): Zone | null {
  return zones.find(zone => 
    zone.descriptor.toLowerCase() === descriptor.toLowerCase()
  ) || null;
}

// Initialize zones on module load
loadZones();