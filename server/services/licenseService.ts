import * as fs from 'fs';
import * as path from 'path';

interface DriverLicense {
  driverName: string;
  company: string;
  driverCallsign: string;
  vehicleCallsign: string;
  lastLogOn: string;
  username: string;
  createdBy: string;
  authorisationDate: string;
  imei: string;
  mdtVersion: string;
  passwordEmailStatus: string;
  passwordSentDate: string;
}

interface VehicleDriverMapping {
  vehicleCallsign: string;
  driverCallsign: string;
  driverName: string;
  company: string;
  lastLogOn: Date | null;
  isActive: boolean;
}

export class LicenseService {
  private licenses: DriverLicense[] = [];
  private vehicleDriverMap: Map<string, VehicleDriverMapping> = new Map();

  constructor() {
    this.loadLicenseData();
  }

  private loadLicenseData() {
    try {
      // Find the most recent CSV file in attached_assets
      const attachedAssetsPath = path.join(process.cwd(), 'attached_assets');
      if (fs.existsSync(attachedAssetsPath)) {
        const csvFiles = fs.readdirSync(attachedAssetsPath).filter(file => file.endsWith('.csv'));
        
        if (csvFiles.length > 0) {
          // Use the most recent CSV file (by name)
          const latestCsv = csvFiles.sort().pop();
          const csvPath = path.join(attachedAssetsPath, latestCsv!);
          console.log(`📋 Loading licenses from: ${csvPath}`);
          const csvContent = fs.readFileSync(csvPath, 'utf-8');
          
          console.log('📋 Loading driver licenses from CSV...');
          
          const lines = csvContent.split('\n');
          const headers = this.parseCSVLine(lines[0]);
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if (values.length >= 4) {
              const license: DriverLicense = {
                driverName: values[0] || '',
                company: values[1] || '',
                driverCallsign: values[2] || '',
                vehicleCallsign: values[3] || '',
                lastLogOn: values[4] || '',
                username: values[5] || '',
                createdBy: values[6] || '',
                authorisationDate: values[7] || '',
                imei: values[8] || '',
                mdtVersion: values[9] || '',
                passwordEmailStatus: values[10] || '',
                passwordSentDate: values[11] || ''
              };
              
              // Only include licenses from CABCO companies
              const validCompanies = ['Cab & Co Canterbury', 'CabCo Ashford'];
              if (!validCompanies.includes(license.company)) {
                continue;
              }
              
              this.licenses.push(license);
              
              // Create vehicle-driver mapping
              const mapping: VehicleDriverMapping = {
                vehicleCallsign: license.vehicleCallsign,
                driverCallsign: license.driverCallsign,
                driverName: license.driverName,
                company: license.company,
                lastLogOn: this.parseDate(license.lastLogOn),
                isActive: this.isDriverActive(license.lastLogOn)
              };
              
              // Check for duplicate vehicle assignments and prioritize most recent driver
              if (this.vehicleDriverMap.has(license.vehicleCallsign)) {
                const existing = this.vehicleDriverMap.get(license.vehicleCallsign);
                const newDate = this.parseDate(license.lastLogOn);
                const existingDate = existing?.lastLogOn;
                
                console.log(`⚠️ DUPLICATE VEHICLE ASSIGNMENT: Vehicle ${license.vehicleCallsign}`);
                console.log(`   🔄 EXISTING: ${existing?.driverName} (${existingDate?.toLocaleDateString()})`);
                console.log(`   🆕 NEW: ${license.driverName} (${newDate?.toLocaleDateString()})`);
                
                // Keep the driver with more recent lastLogOn date
                if (newDate && existingDate && newDate > existingDate) {
                  console.log(`   ✅ UPDATING to newer driver: ${license.driverName}`);
                  this.vehicleDriverMap.set(license.vehicleCallsign, mapping);
                } else {
                  console.log(`   ⏸️ KEEPING existing driver: ${existing?.driverName}`);
                }
              } else {
                // Store the mapping for new vehicle
                this.vehicleDriverMap.set(license.vehicleCallsign, mapping);
              }
              console.log(`📋 MAPPED: Vehicle ${license.vehicleCallsign} → Driver ${license.driverCallsign} (${license.driverName})`);
            }
          }
          
          console.log(`✅ LICENSES LOADED: ${this.licenses.length} licensed drivers found`);
          console.log(`🚗 VEHICLE MAPPINGS: ${this.vehicleDriverMap.size} vehicle-driver assignments`);
          
          // Log some sample mappings
          const sampleMappings = Array.from(this.vehicleDriverMap.entries()).slice(0, 5);
          sampleMappings.forEach(([vehicle, mapping]) => {
            console.log(`📋 VEHICLE ${vehicle} → DRIVER ${mapping.driverCallsign} (${mapping.driverName})`);
          });
        } else {
          console.log('📋 No CSV files found in attached_assets directory');
        }
      } else {
        console.log('📋 attached_assets directory not found');
      }
    } catch (error) {
      console.error('❌ Error loading license data:', error);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    try {
      // Parse format "01/07/2025, 17:14"
      const [datePart, timePart] = dateStr.split(', ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute] = timePart.split(':');
      
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    } catch (error) {
      return null;
    }
  }

  private isDriverActive(lastLogOnStr: string): boolean {
    const lastLogOn = this.parseDate(lastLogOnStr);
    if (!lastLogOn) return false;
    
    // Consider driver active if logged on within last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return lastLogOn > twentyFourHoursAgo;
  }

  // Check if a vehicle has a licensed driver assigned
  public isVehicleLicensed(vehicleCallsign: string): boolean {
    // Special remapping for known incorrect vehicle callsigns from AUTOCAB API
    const actualVehicle = this.getActualVehicleCallsign(vehicleCallsign);
    
    // Try exact match first
    if (this.vehicleDriverMap.has(actualVehicle)) {
      return true;
    }
    
    // Try padded version (e.g., "8" → "08")
    const paddedCallsign = actualVehicle.padStart(2, '0');
    if (this.vehicleDriverMap.has(paddedCallsign)) {
      return true;
    }
    
    // Try with leading zero stripped (e.g., "08" → "8") 
    const strippedCallsign = actualVehicle.replace(/^0+/, '') || '0';
    if (this.vehicleDriverMap.has(strippedCallsign)) {
      return true;
    }
    
    return false;
  }

  // Map incorrect AUTOCAB vehicle callsigns to correct ones
  public getActualVehicleCallsign(apiCallsign: string): string {
    // NOTE: No remapping needed - only show vehicles that exist in CSV
    // Vehicle 194 from AUTOCAB does not exist in license system
    // Vehicle 525 from AUTOCAB does not exist in license system
    return apiCallsign;
  }

  // Get driver info for a vehicle
  public getDriverForVehicle(vehicleCallsign: string): VehicleDriverMapping | null {
    // Special remapping for known incorrect vehicle callsigns from AUTOCAB API
    const actualVehicle = this.getActualVehicleCallsign(vehicleCallsign);
    
    // Try exact match first
    let mapping = this.vehicleDriverMap.get(actualVehicle);
    if (mapping) return mapping;
    
    // Try padded version (e.g., "8" → "08")
    const paddedCallsign = actualVehicle.padStart(2, '0');
    mapping = this.vehicleDriverMap.get(paddedCallsign);
    if (mapping) return mapping;
    
    // Try with leading zero stripped (e.g., "08" → "8") 
    const strippedCallsign = actualVehicle.replace(/^0+/, '') || '0';
    mapping = this.vehicleDriverMap.get(strippedCallsign);
    if (mapping) return mapping;
    
    return null;
  }

  // Get all licensed vehicles
  public getLicensedVehicles(): VehicleDriverMapping[] {
    return Array.from(this.vehicleDriverMap.values());
  }

  // Get active licensed vehicles (recently logged on)
  public getActiveLicensedVehicles(): VehicleDriverMapping[] {
    return Array.from(this.vehicleDriverMap.values()).filter(mapping => mapping.isActive);
  }

  // Filter vehicles to only include licensed ones
  public filterLicensedVehicles(vehicles: any[]): any[] {
    return vehicles.filter(vehicle => {
      // Check for remapping first
      const actualVehicle = this.getActualVehicleCallsign(vehicle.callsign);
      if (actualVehicle !== vehicle.callsign) {
        console.log(`🔄 VEHICLE REMAPPING: ${vehicle.callsign} → ${actualVehicle}`);
      }
      
      const isLicensed = this.isVehicleLicensed(vehicle.callsign);
      const driverInfo = this.getDriverForVehicle(vehicle.callsign);
      
      if (!isLicensed) {
        console.log(`🚫 UNLICENSED VEHICLE: ${vehicle.callsign} - no driver license found`);
        return false;
      }
      
      console.log(`✅ LICENSED VEHICLE: ${vehicle.callsign} → Driver ${driverInfo?.driverName} (${driverInfo?.driverCallsign})`);
      
      // Add driver license info to vehicle object while preserving existing fields (zone, timeClear, etc.)
      vehicle.licensedDriver = driverInfo;
      vehicle.isLicensed = true;
      
      // Preserve all existing vehicle fields from AUTOCAB processing (zone, timeClear, etc.)
      // These fields are already calculated in getAutocabVehiclesWithStatus() and should not be overwritten
      
      return true;
    });
  }

  public getLicenseStats() {
    const totalLicenses = this.licenses.length;
    const activeLicenses = this.getActiveLicensedVehicles().length;
    const vehicleMappings = this.vehicleDriverMap.size;
    
    return {
      totalLicenses,
      activeLicenses,
      vehicleMappings,
      recentlyActive: activeLicenses
    };
  }
}

// Export singleton instance
export const licenseService = new LicenseService();