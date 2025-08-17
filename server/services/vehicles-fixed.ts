import fs from 'fs';
import path from 'path';
import { calculateStatusColor } from './status-color-fix';

// Fixed vehicle implementation with proper status colors
export async function getVehiclesWithStatusColors(): Promise<{ success: boolean, vehicles: any[] }> {
  try {
    console.log('🎯 FIXED VEHICLES: Implementing proper status colors');

    const apiKey = process.env.AUTOCAB_API_KEY;
    if (!apiKey) {
      console.log('❌ No AUTOCAB API key found');
      return { success: false, vehicles: [] };
    }

    // Load driver licenses
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Licences (1)_1751471208431.csv');
    let driverLicenses: any[] = [];
    
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1);
      
      driverLicenses = lines.filter(line => line.trim()).map(line => {
        const cols = line.split('","').map(col => col.replace(/^"|"$/g, ''));
        return {
          driverCallsign: cols[0]?.replace('﻿', ''),
          driverName: cols[1],
          company: cols[2],
          vehicleCallsign: cols[3],
          vehicleRegistration: cols[4],
          licenseNumber: cols[5]
        };
      });
      
      console.log(`📋 LICENSES LOADED: ${driverLicenses.length} licensed drivers`);
    } catch (error) {
      console.log('❌ Error loading licenses:', error);
    }

    // Get live driver shifts
    const liveShiftsResponses = await Promise.all([
      fetch(`https://autocab-api.azure-api.net/driver/v1/driverliveshifts?companyId=1`, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      }),
      fetch(`https://autocab-api.azure-api.net/driver/v1/driverliveshifts?companyId=2`, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      }),
      fetch(`https://autocab-api.azure-api.net/driver/v1/driverliveshifts?companyId=4`, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      })
    ]);

    let allLiveShifts: any[] = [];
    for (const response of liveShiftsResponses) {
      if (response.ok) {
        const data = await response.json();
        allLiveShifts = allLiveShifts.concat(data);
      }
    }

    const uniqueVehicles = Array.from(new Map(allLiveShifts.map(shift => [shift.vehicleCallsign, shift])).values());
    console.log(`🚛 LIVE SHIFT VEHICLES: ${allLiveShifts.length} total → ${uniqueVehicles.length} unique vehicles`);

    // Get vehicle statuses and GPS data
    const [statusResponses, gpsResponses] = await Promise.all([
      Promise.all([
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclestatuses?companyId=1`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        }),
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclestatuses?companyId=2`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        }),
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclestatuses?companyId=4`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        })
      ]),
      Promise.all([
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclegpsposition?companyId=1`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        }),
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclegpsposition?companyId=2`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        }),
        fetch(`https://autocab-api.azure-api.net/vehicle/v1/vehiclegpsposition?companyId=4`, {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        })
      ])
    ]);

    let allVehicleStatuses: any[] = [];
    let allGpsData: any[] = [];

    for (const response of statusResponses) {
      if (response.ok) {
        const data = await response.json();
        allVehicleStatuses = allVehicleStatuses.concat(data);
      }
    }

    for (const response of gpsResponses) {
      if (response.ok) {
        const data = await response.json();
        allGpsData = allGpsData.concat(data);
      }
    }

    const authenticVehicles: any[] = [];

    for (const shift of uniqueVehicles) {
      const statusData = allVehicleStatuses.find(status => 
        status.id?.toString() === shift.vehicleCallsign?.toString()
      );
      
      const gpsData = allGpsData.find(gps => 
        gps.id?.toString() === shift.vehicleCallsign?.toString()
      );

      let coordinates = null;
      if (gpsData && gpsData.location && !gpsData.isEmpty) {
        const lat = parseFloat(gpsData.location.latitude || gpsData.location.lat);
        const lng = parseFloat(gpsData.location.longitude || gpsData.location.lng);
        
        if (lat && lng && lat !== 0 && lng !== 0) {
          // Filter UK coordinates only
          if (lat >= 49.5 && lat <= 61 && lng >= -8.5 && lng <= 2) {
            coordinates = { lat, lng };
          }
        }
      }

      // Use enhanced status color calculation
      const colorResult = calculateStatusColor(statusData, shift.vehicleCallsign);
      
      const licensedDriver = driverLicenses.find(license => 
        license.vehicleCallsign?.toString() === shift.vehicleCallsign?.toString()
      );

      authenticVehicles.push({
        id: Math.floor(Math.random() * 1000) + Date.now(),
        callsign: shift.vehicleCallsign,
        make: 'Unknown',
        model: 'Vehicle',
        registration: `V${shift.vehicleCallsign}`,
        status: colorResult.text,
        statusColor: colorResult.color,
        coordinates: coordinates,
        isOnline: true,
        vehicleName: `Vehicle ${shift.vehicleCallsign}`,
        driverName: shift.driver?.fullName || '', // ONLY authentic data - empty string if no live shift
        driverCallsign: shift.driverCallsign || '', // ONLY authentic data - empty string if no driver
        shiftStats: {
          cashBookings: shift.cashBookings || 0,
          accountBookings: shift.accountBookings || 0
        }
      });

      if (coordinates) {
        console.log(`✅ VEHICLE WITH PROPER COLOR: ${shift.vehicleCallsign} - ${colorResult.text} [${colorResult.color.toUpperCase()}] (${coordinates.lat}, ${coordinates.lng})`);
      }
    }

    console.log(`🎯 FINAL RESULT WITH COLORS: ${authenticVehicles.length} vehicles with proper status colors`);
    
    // Count by status color
    const colorCounts = authenticVehicles.reduce((acc: any, vehicle: any) => {
      acc[vehicle.statusColor] = (acc[vehicle.statusColor] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📊 STATUS COLOR BREAKDOWN:`, colorCounts);

    return { success: true, vehicles: authenticVehicles };
  } catch (error) {
    console.log('❌ Error in getVehiclesWithStatusColors:', error);
    return { success: false, vehicles: [] };
  }
}