// BONUS: API pentru listarea tuturor locațiilor
import type { Express } from "express";
import { DRIVER_LOCATIONS } from './driver-storage';

export function setupStorageEndpoints(app: Express) {
  // API de listare a tuturor locațiilor salvate
  app.get('/api/driver/all-locations', (req, res) => {
    try {
      const allLocations = [...DRIVER_LOCATIONS.entries()].map(([id, data]) => ({
        driverId: id,
        coordinates: { lat: data.lat, lng: data.lng },
        timestamp: data.timestamp,
        lastUpdate: new Date(data.timestamp).toISOString(),
        speed: data.speed || 0,
        heading: data.heading || 0,
        isOnline: (Date.now() - data.timestamp) < 30000 // 30 second threshold
      }));

      res.json({
        success: true,
        totalDrivers: allLocations.length,
        drivers: allLocations,
        onlineCount: allLocations.filter(d => d.isOnline).length
      });
    } catch (error) {
      console.error('❌ Error fetching all driver locations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch driver locations'
      });
    }
  });

  // Debug endpoint pentru a vedea storage-ul raw
  app.get('/api/driver/storage-debug', (req, res) => {
    try {
      const rawData = Object.fromEntries(DRIVER_LOCATIONS);
      res.json({
        success: true,
        storageSize: DRIVER_LOCATIONS.size,
        rawData: rawData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}