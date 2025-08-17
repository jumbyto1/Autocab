import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.resolve(__dirname, 'driver-locations.json');

export const DRIVER_LOCATIONS = new Map<string, any>();

// Track last saved data to avoid unnecessary writes
let lastSavedData = "";

export function loadLocationsFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const data = JSON.parse(raw);
      data.forEach(([key, value]: [string, any]) => {
        DRIVER_LOCATIONS.set(key, value);
      });
      console.log(`📦 PERSISTENT STORAGE: Loaded ${DRIVER_LOCATIONS.size} drivers from disk.`);
    } else {
      console.log(`📦 PERSISTENT STORAGE: No existing storage file found, starting fresh.`);
    }
  } catch (error) {
    console.error('❌ Failed to load locations. Starting fresh. Error:', error.message);
    // Handle corrupt file by renaming as backup
    try {
      fs.renameSync(STORAGE_FILE, `${STORAGE_FILE}.corrupt.bak`);
      console.warn('⚠️ Corrupt file renamed as backup.');
    } catch {}
    DRIVER_LOCATIONS.clear();
  }
}

export function saveLocationsToDisk() {
  try {
    const data = JSON.stringify([...DRIVER_LOCATIONS.entries()]);
    // Only save if data has actually changed
    if (data !== lastSavedData) {
      fs.writeFileSync(STORAGE_FILE, data);
      lastSavedData = data;
      console.log(`💾 PERSISTENT STORAGE: Saved ${DRIVER_LOCATIONS.size} drivers to disk.`);
    }
  } catch (error) {
    console.error('❌ Error saving driver locations to disk:', error);
  }
}

// Cleanup function to remove old locations (older than 5 minutes)
export function cleanupOldLocations() {
  const currentTime = Date.now();
  const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  let removedCount = 0;
  for (const [key, value] of DRIVER_LOCATIONS.entries()) {
    if (value.timestamp && (currentTime - value.timestamp) > CLEANUP_THRESHOLD) {
      DRIVER_LOCATIONS.delete(key);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`🧹 CLEANUP: Removed ${removedCount} old driver locations`);
    saveLocationsToDisk();
  }
}

// Initialize driver 900 automatically on startup - ONLY if not already stored
const initializeDriver900 = () => {
  // Check if driver 900 already exists in storage (from GPS live feed)
  if (DRIVER_LOCATIONS.has("900")) {
    const existing = DRIVER_LOCATIONS.get("900");
    console.log(`🔄 DRIVER 900 ALREADY EXISTS: Using stored GPS coordinates (${existing.lat}, ${existing.lng}) from GPS live feed`);
    return; // Don't overwrite existing GPS live data
  }
  
  const driver900Data = {
    lat: 51.27953123,
    lng: 1.08765432,
    timestamp: Date.now(),
    driverId: "900",
    heading: 0,
    speed: 0,
    shiftStartTime: Date.now(),
    source: "default_initialization"
  };
  
  DRIVER_LOCATIONS.set("900", driver900Data);
  console.log(`🚗 DRIVER 900 INITIALIZED: Alex JMB activated at default coordinates (${driver900Data.lat}, ${driver900Data.lng})`);
  saveLocationsToDisk();
};

// Controlled driver system lifecycle
export function startDriverSystem() {
  console.log(`🔧 DRIVER SYSTEM: Starting controlled lifecycle...`);
  
  // Auto-cleanup every 2 minutes
  setInterval(cleanupOldLocations, 2 * 60 * 1000);
  
  // Initialize driver 900 after a short delay to ensure system is ready
  setTimeout(initializeDriver900, 5000);

  // DISABLED: Auto-refresh was causing permanent online status
  // Only show driver as online when GPS is actually fresh from real updates
  // No more automatic timestamp refresh - genuine GPS timeout detection
}

// Function to update driver location from external sources (HIGH PRECISION GPS)
export const updateDriverLocation = async (driverId: string, locationData: any) => {
  try {
    const existing = DRIVER_LOCATIONS.get(driverId);
    
    // Preserve ALL GPS fields with maximum precision
    const updated = {
      ...existing,
      ...locationData,
      // Override timestamp only if not provided in locationData
      timestamp: locationData.timestamp || Date.now(),
      source: locationData.source || "CABCO_EXTERNAL"
    };
    
    // Ensure coordinates are properly formatted as numbers with FULL precision
    if (updated.lat) updated.lat = parseFloat(updated.lat);
    if (updated.lng) updated.lng = parseFloat(updated.lng);
    if (updated.latitude) updated.lat = parseFloat(updated.latitude);
    if (updated.longitude) updated.lng = parseFloat(updated.longitude);
    
    // Preserve ALL GPS metadata
    if (updated.speed) updated.speed = parseFloat(updated.speed);
    if (updated.heading) updated.heading = parseFloat(updated.heading);
    if (updated.accuracy) updated.accuracy = parseFloat(updated.accuracy);
    
    DRIVER_LOCATIONS.set(driverId, updated);
    
    const logMsg = `📍 GPS PRECISION UPDATE: ${driverId} at (${updated.lat}, ${updated.lng})`;
    const details = [];
    if (updated.speed) details.push(`speed: ${updated.speed}km/h`);
    if (updated.heading) details.push(`heading: ${updated.heading}°`);
    if (updated.accuracy) details.push(`accuracy: ${updated.accuracy}m`);
    if (updated.source) details.push(`source: ${updated.source}`);
    
    console.log(`${logMsg} - ${details.join(', ')}`);
    saveLocationsToDisk();
    
    return true;
  } catch (error) {
    console.error("❌ Failed to update driver location:", error);
    return false;
  }
};
