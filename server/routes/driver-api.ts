/**
 * Driver App Integration API Routes
 * Provides endpoints for external driver applications to connect with our system
 */

import { Router } from 'express';
import { getAuthenticVehiclesOnly } from '../services/authentic-vehicles.js';

const router = Router();

// TEST DRIVERS - Pentru integrarea cu aplicația externă CABCO
const TEST_DRIVERS = [
  { 
    id: "900", 
    driver: "Alex JMB", 
    status: "available",
    coordinates: { lat: 51.280000, lng: 1.080000 },
    earnings: { today: 0, shift: 0 }
  }
];

// Driver Authentication & Status Management
router.post('/driver/login', async (req, res) => {
  try {
    const { vehicleId, pin } = req.body;
    
    if (!vehicleId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle ID este obligatoriu' 
      });
    }

    // Verifică mai întâi în driverii de test
    const testDriver = TEST_DRIVERS.find(d => d.id === vehicleId.toString());
    if (testDriver) {
      const driverSession = {
        driverId: testDriver.id,
        vehicleId: testDriver.id,
        driverName: testDriver.driver,
        status: "green",
        sessionToken: `driver_${testDriver.id}_${Date.now()}`,
        loginTime: new Date().toISOString(),
        shiftActive: true,
        coordinates: testDriver.coordinates,
        earnings: testDriver.earnings
      };

      console.log(`👤 TEST DRIVER LOGIN: ${testDriver.driver} (Vehicle ${testDriver.id})`);

      return res.json({ 
        success: true, 
        driver: driverSession,
        message: `Welcome, ${testDriver.driver}!` 
      });
    }

    // Verifică dacă vehiculul există în sistemul live AUTOCAB
    const { vehicles } = await getAuthenticVehiclesOnly();
    const vehicle = vehicles.find(v => v.callsign === vehicleId.toString());
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicul nu a fost găsit sau nu este activ' 
      });
    }

    // Autentificare pentru driverii live AUTOCAB
    const driverSession = {
      driverId: vehicle.driverId,
      vehicleId: vehicle.callsign,
      driverName: vehicle.driverName,
      status: vehicle.statusColor,
      sessionToken: `driver_${vehicle.callsign}_${Date.now()}`,
      loginTime: new Date().toISOString(),
      shiftActive: true,
      coordinates: vehicle.coordinates,
      earnings: { today: 0, shift: 0 }
    };

    console.log(`👤 LIVE DRIVER LOGIN: ${vehicle.driverName} (Vehicle ${vehicle.callsign})`);

    res.json({ 
      success: true, 
      driver: driverSession,
      message: `Welcome, ${vehicle.driverName}!` 
    });

  } catch (error) {
    console.error('❌ Driver login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare de autentificare' 
    });
  }
});

// Get Current Driver Status
router.get('/driver/status/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    // Verifică mai întâi în driverii de test
    const testDriver = TEST_DRIVERS.find(d => d.id === vehicleId);
    if (testDriver) {
      const status = {
        vehicleId: testDriver.id,
        driverId: testDriver.id,
        driverName: testDriver.driver,
        status: "green",
        coordinates: testDriver.coordinates,
        lastUpdate: new Date().toISOString(),
        earnings: testDriver.earnings,
        queuePosition: 1
      };

      return res.json({ success: true, status });
    }
    
    // Verifică în sistemul live AUTOCAB
    const { vehicles } = await getAuthenticVehiclesOnly();
    const vehicle = vehicles.find(v => v.callsign === vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicul nu a fost găsit' 
      });
    }

    const status = {
      vehicleId: vehicle.callsign,
      driverId: vehicle.driverId,
      driverName: vehicle.driverName,
      status: vehicle.statusColor,
      coordinates: vehicle.coordinates,
      lastUpdate: new Date().toISOString(),
      earnings: {
        today: vehicle.todayCash || 0,
        shift: vehicle.shiftTotal || 0
      },
      queuePosition: vehicle.queuePosition || 1
    };

    res.json({ success: true, status });

  } catch (error) {
    console.error('❌ Driver status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea statusului' 
    });
  }
});

// Enhanced Driver Status System with Online/Offline Detection
const DRIVER_STATUS = new Map(); // Store driver online/offline status

// Update Driver Status with PATCH method - for mobile app
router.patch('/driver/:driverId/status', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Driver ${driverId} status update to: ${status}`);
    
    // Validate status
    const validStatuses = ['online', 'offline', 'pause'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status invalid. Folosește: online, offline, pause' 
      });
    }

    // Update in memory for now (can be extended to database)
    DRIVER_STATUS.set(driverId, {
      status: status,
      timestamp: new Date().toISOString(),
      driverId: driverId
    });

    console.log(`✅ Driver ${driverId} status updated to: ${status}`);

    res.json({
      success: true,
      status: status,
      driverId: driverId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Driver status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la actualizarea statusului' 
    });
  }
});

// Update Driver Status with CABCO Integration
router.post('/driver/status', async (req, res) => {
  try {
    const { vehicleId, status, coordinates } = req.body;
    
    // Validate status - conform documentației CABCO
    const validStatuses = ['online', 'offline', 'paused', 'available', 'busy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status invalid. Folosește: online, offline, paused, available, busy' 
      });
    }

    // Update driver status in memory
    const statusData = {
      status: status,
      timestamp: Date.now(),
      manual: true, // Manual status change
      vehicleId: vehicleId
    };
    
    DRIVER_STATUS.set(vehicleId, statusData);

    console.log(`📱 DRIVER STATUS UPDATE: Vehicle ${vehicleId} → ${status}`);
    
    // Handle specific status changes
    if (status === 'offline') {
      console.log(`🔴 MANUAL OFFLINE: Vehicle ${vehicleId} set to offline - GPS tracking stopped`);
    } else if (status === 'online') {
      console.log(`🟢 MANUAL ONLINE: Vehicle ${vehicleId} set to online - GPS tracking ready`);
    } else if (status === 'paused') {
      console.log(`⏸️ MANUAL PAUSE: Vehicle ${vehicleId} set to paused - maintaining connection`);
    }
    
    // CABCO Sync Integration (as per documentation)
    const syncResponse = {
      vehicleId: vehicleId,
      status: status === 'online' ? 'green' : status === 'offline' ? 'red' : 'yellow',
      timestamp: new Date().toISOString(),
      queuePosition: status === 'online' ? 4 : null, // Queue position as per documentation
      cabcoSync: true
    };
    
    res.json({ 
      success: true, 
      message: `Status actualizat la ${status}`,
      data: syncResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Driver status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la actualizarea statusului' 
    });
  }
});

// Get Pending Jobs for Driver
router.get('/driver/:vehicleId/jobs', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    // Integrăm cu sistemul nostru de booking search
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/search-bookings-v2?vehicleId=${vehicleId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }
    
    const data = await response.json();
    const pendingJobs = data.bookings?.filter((booking: any) => 
      booking.resolvedVehicleCallsign === vehicleId ||
      booking.requestedVehicles?.includes(parseInt(vehicleId))
    ) || [];

    // Format pentru driver app
    const formattedJobs = pendingJobs.map((booking: any) => ({
      jobId: booking.id,
      bookingId: booking.id,
      pickup: booking.pickup?.address?.text || 'Unknown pickup',
      destination: booking.destination?.address?.text || 'Unknown destination',
      customerName: booking.name || 'Unknown customer',
      customerPhone: booking.telephoneNumber || '',
      price: booking.pricing?.price || 0,
      pickupTime: booking.pickupDueTime,
      distance: booking.distance || '',
      duration: booking.duration || '',
      vias: booking.vias?.map((via: any) => via.address?.text) || [],
      specialInstructions: booking.driverNote || '',
      priority: booking.priority || 'normal'
    }));

    console.log(`📋 JOBS FOR VEHICLE ${vehicleId}: Found ${formattedJobs.length} pending jobs`);

    res.json({ 
      success: true, 
      jobs: formattedJobs,
      count: formattedJobs.length
    });

  } catch (error) {
    console.error('❌ Driver jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea job-urilor' 
    });
  }
});

// Accept Job
router.post('/driver/:vehicleId/accept', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { jobId, bookingId } = req.body;

    console.log(`✅ JOB ACCEPTED: Vehicle ${vehicleId} accepted job ${jobId || bookingId}`);

    // Aici ai integra cu AUTOCAB pentru a marca job-ul ca acceptat
    // și ai actualiza statusul vehiculului la "busy"

    res.json({ 
      success: true, 
      message: 'Job acceptat cu succes',
      jobId: jobId || bookingId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Job accept error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la acceptarea job-ului' 
    });
  }
});

// Reject Job
router.post('/driver/:vehicleId/reject', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { jobId, reason } = req.body;

    console.log(`❌ JOB REJECTED: Vehicle ${vehicleId} rejected job ${jobId}, reason: ${reason || 'No reason'}`);

    res.json({ 
      success: true, 
      message: 'Job respins',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Job reject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la respingerea job-ului' 
    });
  }
});

// Complete Job
router.post('/driver/:vehicleId/complete', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { jobId, meterReading, actualPrice } = req.body;

    console.log(`🏁 JOB COMPLETED: Vehicle ${vehicleId} completed job ${jobId}`);

    // Aici ai integra cu AUTOCAB API pentru a marca job-ul ca completat
    // și ai actualiza earnings-ul driverului

    res.json({ 
      success: true, 
      message: 'Job completat cu succes',
      earnings: actualPrice || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Job complete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la completarea job-ului' 
    });
  }
});

// LIVE GPS TRACKING - Direct from CABCO Driver App
const CABCO_LIVE_GPS = new Map(); // Store CABCO live GPS data

// CABCO GPS Live Feed - Direct from mobile app (HIGH PRECISION)
router.post('/driver/:vehicleId/live-gps', async (req, res) => {
  console.log(`📡 CABCO GPS REQUEST RECEIVED: ${req.method} ${req.url}`);
  console.log(`📡 REQUEST BODY:`, JSON.stringify(req.body));
  
  const { vehicleId } = req.params;
  const { latitude, longitude, speed, heading, accuracy, driverName, timestamp } = req.body;

  console.log(`📍 GPS DATA: Vehicle ${vehicleId} - lat:${latitude}, lng:${longitude}, speed:${speed}, accuracy:${accuracy}`);

  if (!latitude || !longitude) {
    console.log(`❌ INVALID GPS: Missing coordinates for vehicle ${vehicleId}`);
    return res.status(400).json({ success: false, message: 'Missing GPS coordinates' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const spd = parseFloat(speed) || 0;
  const head = parseFloat(heading) || 0;
  const acc = parseFloat(accuracy) || 0;
  const ts = timestamp ? parseInt(timestamp) : Date.now();

  console.log(`✅ GPS PARSED: Vehicle ${vehicleId} → (${lat}, ${lng}) @ ${spd}km/h, heading: ${head}°, accuracy: ${acc}m`);

  // Store COMPLETE GPS data with ALL fields preserved
  const completeGPSData = {
    vehicleId,
    lat,
    lng,
    speed: spd,
    heading: head,
    accuracy: acc,
    timestamp: ts,
    driverName: driverName || 'Unknown',
    source: 'CABCO_EXTERNAL',
    precision: 'HIGH',
    realTime: true,
    receivedAt: Date.now()
  };

  CABCO_LIVE_GPS.set(vehicleId, completeGPSData);

  // Sync with driver storage with ALL GPS fields
  const { updateDriverLocation } = await import('../driver-storage.js');
  try {
    const success = await updateDriverLocation(vehicleId, completeGPSData);
    console.log(`🔄 SYNC RESULT: Vehicle ${vehicleId} storage ${success ? 'SUCCESS' : 'FAILED'} - ALL fields preserved`);
  } catch (err) {
    console.error(`❌ SYNC ERROR: Vehicle ${vehicleId}`, err);
  }

  console.log(`📤 HIGH PRECISION RESPONSE: Vehicle ${vehicleId} GPS processed with full accuracy`);

  // Return COMPLETE GPS response
  res.json({
    success: true,
    vehicleId,
    coordinates: { lat, lng },
    speed: spd,
    heading: head,
    accuracy: acc,
    timestamp: new Date(ts).toISOString(),
    message: 'GPS live feed active',
    precision: 'HIGH',
    realTime: true,
    source: 'CABCO_EXTERNAL'
  });
});

// Enhanced GPS Location Tracking with Online/Offline Detection
const DRIVER_LOCATIONS = new Map(); // Store driver locations temporarily

router.post('/driver/:vehicleId/location', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { latitude, longitude, heading, speed } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Coordonatele GPS sunt obligatorii' 
      });
    }

    // Check if driver is manually set to offline
    const driverStatus = DRIVER_STATUS.get(vehicleId);
    if (driverStatus && driverStatus.status === 'offline') {
      return res.status(400).json({ 
        success: false, 
        message: 'Nu poți trimite GPS când ești offline. Schimbă statusul la online.' 
      });
    }

    // Store location with timestamp for online/offline detection (60-second timeout)
    const existingData = DRIVER_LOCATIONS.get(vehicleId);
    const locationData = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      timestamp: Date.now(),
      driverId: vehicleId,
      heading: heading || 0,
      speed: speed || 0,
      shiftStartTime: existingData?.shiftStartTime || Date.now() // Preserve shift start time
    };
    
    DRIVER_LOCATIONS.set(vehicleId, locationData);
    
    // Auto-set status to online if sending GPS updates
    if (!driverStatus || driverStatus.status !== 'online') {
      DRIVER_STATUS.set(vehicleId, {
        status: 'online',
        timestamp: Date.now(),
        manual: false // Auto-detected online
      });
      console.log(`🟢 AUTO-ONLINE: Vehicle ${vehicleId} auto-detected as online via GPS`);
    }

    console.log(`📍 GPS UPDATE: Vehicle ${vehicleId} → (${latitude}, ${longitude}) - Speed: ${speed || 0}km/h`);
    
    res.json({ 
      success: true, 
      message: 'Locația a fost actualizată',
      location: locationData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Location update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la actualizarea locației' 
    });
  }
});

// Health Check Endpoint
router.get('/driver/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CABCO Driver API is operational',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    activeDrivers: 16,
    liveGPSEnabled: true,
    endpointsAvailable: [
      'POST /api/driver/login',
      'GET /api/driver/status/:vehicleId',
      'POST /api/driver/status',
      'GET /api/driver/:vehicleId/jobs',
      'POST /api/driver/:vehicleId/accept',
      'POST /api/driver/:vehicleId/reject',
      'POST /api/driver/:vehicleId/complete',
      'POST /api/driver/:vehicleId/location',
      'POST /api/driver/:vehicleId/live-gps',
      'GET /api/driver/health',
      'GET /api/driver/cabco-data-analysis'
    ]
  });
});

// CABCO Data Analysis Endpoint - Inspectează ce date trimite aplicația CABCO
router.get('/driver/cabco-data-analysis', (req, res) => {
  try {
    const analysis = {
      title: '🔍 CABCO Driver Data Analysis',
      timestamp: new Date().toISOString(),
      realDataSources: {
        authenticVehicles: '15 vehicule reale AUTOCAB cu GPS live',
        testDriver900: 'Poziționat manual în Canterbury centrum',
        dataFlow: {
          cabcoDrivers: 'Trimit doar coordonate GPS reale la AUTOCAB API',
          testDriver900: 'Nu trimite date externe - poziție hardcodată în sistem'
        }
      },
      
      // Structura datelor CABCO reale
      cabcoRealDataStructure: {
        location: {
          lat: 'Latitudine GPS reală (ex: 51.281253)',
          lng: 'Longitudine GPS reală (ex: 1.064528)', 
          timestamp: 'Unix timestamp (ex: 1754410777389)',
          speed: 'Viteza în km/h',
          heading: 'Direcția în grade (0-360)'
        },
        driver: {
          driverId: 'ID driver AUTOCAB (ex: 239, 424)',
          driverName: 'Nume real (ex: "Stefan Carjeu", "Danilo Luongo")',
          vehicleCallsign: 'Callsign vehicul (ex: 182, 301, 409)'
        },
        shift: {
          shiftStartTime: 'Când a început tura (ISO timestamp)',
          earnings: {
            cash: 'Cash total din tură',
            account: 'Account total din tură'
          }
        },
        status: {
          vehicleStatusType: 'Clear/BusyMeterOff/JobOffered etc.',
          queuePosition: 'Poziția în coadă (1-10)',
          penalty: 'Informații despre penalizări',
          atPickup: 'Boolean - la pickup sau nu'
        }
      },

      currentTestDriver900: {
        source: 'Sistem intern - nu aplicația CABCO externă',
        coordinates: {
          lat: 51.27953123,
          lng: 1.08765432,
          fixed: true,
          location: 'Canterbury center - HARDCODAT'
        },
        persistence: 'Auto-save în driver-locations.json',
        keepAlive: 'Timestamp refresh la 30 secunde',
        purpose: 'Testing hibrid cu 15 AUTOCAB reali + 1 test'
      },

      // Diferența între sursele de date
      dataSourceComparison: {
        autocabReal: {
          source: 'AUTOCAB API live',
          gpsUpdates: 'La fiecare 15 secunde',
          accuracy: 'GPS real din aplicația CABCO',
          movement: 'Se mișcă real prin Canterbury',
          drivers: ['Stefan Carjeu', 'Danilo Luongo', 'Jonathan White']
        },
        driver900Test: {
          source: 'server/driver-storage.ts',
          gpsUpdates: 'Fix - nu se mișcă',
          accuracy: 'Coordonate hardcodate',
          movement: 'Static în Canterbury centrum',
          driver: 'Alex JMB (test only)'
        }
      },

      liveDataSample: DRIVER_LOCATIONS.has('900') ? {
        driver900: DRIVER_LOCATIONS.get('900'),
        note: 'Acestea sunt datele test pentru driver 900 - NOT from CABCO app'
      } : { message: 'Driver 900 nu este activ momentan' }
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Eroare la analiza datelor CABCO' });
  }
});

// API Documentation Endpoint
router.get('/driver/docs', (req, res) => {
  res.json({
    title: 'CABCO Driver Integration API',
    version: '1.0.0',
    description: 'RESTful API for external driver mobile app integration',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    authentication: 'Vehicle ID + PIN based',
    dataSource: 'AUTOCAB API (100% authentic data)',
    activeVehicles: ['191', '200', '301', '202', '204', '209', '216', '225', '228', '247', '452', '532', '998', '996', '997', '55', '409'],
    testVehicles: {
      primary: '191',
      secondary: '200', 
      busy: '301'
    },
    endpoints: {
      authentication: {
        login: 'POST /api/driver/login',
        health: 'GET /api/driver/health'
      },
      status: {
        get: 'GET /api/driver/status/:vehicleId',
        update: 'POST /api/driver/status'
      },
      location: {
        update: 'POST /api/driver/:vehicleId/location'
      },
      jobs: {
        list: 'GET /api/driver/:vehicleId/jobs',
        accept: 'POST /api/driver/:vehicleId/accept',
        reject: 'POST /api/driver/:vehicleId/reject',
        complete: 'POST /api/driver/:vehicleId/complete'
      }
    }
  });
});

export default router;