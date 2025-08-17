export interface ExtractedJobData {
  date?: string;
  time?: string;
  pickup?: string;
  destination?: string;
  via1?: string;
  via2?: string;
  via3?: string;
  via4?: string;
  via5?: string;
  customerName?: string;
  customerPhone?: string;
  customerReference?: string;
  passengers?: number;
  luggage?: number;
  vehicleType?: string;
  mobilityAids?: string;
  price?: string;
  customerAccount?: string;
  jobNumber?: string;
  driverNotes?: string;
  // Location-specific passenger information
  pickupNote?: string;
  via1Note?: string;
  via2Note?: string;
  via3Note?: string;
  via4Note?: string;
  via5Note?: string;
  destinationNote?: string;
}

export class EmailParser {
  private static pricePatterns = [
    // SAGA job price patterns (without VAT) - prioritized first  
    /Job\s*Price:\s*£(\d+\.?\d*)/i,
    /JOB\s*PRICE:\s*£(\d+\.?\d*)/i,
    // Generic patterns
    /PRICE:\s*£(\d+\.?\d*)/i,
    /COST:\s*£(\d+\.?\d*)/i,
    /price[:\s]*£(\d+\.?\d*)/i,
    /cost[:\s]*£(\d+\.?\d*)/i,
    // Total Price patterns (with VAT) - moved to end as fallback
    /Total\s*Price:\s*£(\d+\.?\d*)/i,
    /TOTAL\s*PRICE:\s*£(\d+\.?\d*)/i,
    /total[:\s]*£(\d+\.?\d*)/i,
    /£(\d+\.?\d*)/,
  ];

  private static datePatterns = [
    /(\d{1,2}\s+\w+\s+\d{4})/,
    /date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /date[:\s]*(\d{4}-\d{1,2}-\d{1,2})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
  ];

  private static timePatterns = [
    /1ST PICK UP:\s*(\d{1,2}:\d{2})/i,
    /PICK UP:\s*(\d{1,2}:\d{2})/i,
    /time[:\s]*(\d{1,2}:\d{2})/i,
    /(\d{1,2}:\d{2})/,
  ];

  private static pickupPatterns = [
    /Pick up[\s\S]*?ADDRESS:\s*([^\n]+)/i,
    /PICK UP FROM[:\s]*([^\n]+)/i,
    /pickup[:\s]*(.+?)(?=destination|drop|customer|vehicle|passenger|luggage|price|\n\n)/i,
    /from[:\s]*(.+?)(?=to|destination|drop|customer|vehicle|passenger|luggage|price|\n\n)/i,
    /collect[:\s]*(.+?)(?=destination|drop|customer|vehicle|passenger|luggage|price|\n\n)/i,
  ];

  private static destinationPatterns = [
    /Drop Off[\s\S]*?ADDRESS:\s*([^\n]+)/i,
    /DROP OFF AT[:\s]*([^\n]+)/i,
    /destination[:\s]*(.+?)(?=customer|vehicle|passenger|luggage|price|\n\n)/i,
    /to[:\s]*(.+?)(?=customer|vehicle|passenger|luggage|price|\n\n)/i,
    /drop[:\s]*(.+?)(?=customer|vehicle|passenger|luggage|price|\n\n)/i,
  ];

  private static customerNamePatterns = [
    /Customer Name\(s\):\s*([^\n]+?)(?=\s*Address:|$)/i,
    /PASSENGER DETAILS:\s*[\n\r]+([^\n\r]+)/i,
    /NAME:\s*([^\n]+?)(?=\s*BOOKING|PHONE|INFO|\n|$)/i,
    /name[:\s]*(.+?)(?=phone|tel|customer|vehicle|passenger|luggage|price|\n)/i,
    /customer[:\s]*name[:\s]*(.+?)(?=phone|tel|vehicle|passenger|luggage|price|\n)/i,
  ];

  private static phonePatterns = [
    /Customer Mobile Number:\s*([^\n]+)/i,
    /Customer Home Phone Number:\s*([^\n]+)/i,
    /Phone:\s*([^\n]+)/i,
    /PHONE:\s*([^\n]+?)(?=\s*INFO|\n|$)/i,
    /phone[:\s]*(.+?)(?=name|customer|vehicle|passenger|luggage|price|\n)/i,
    /tel[:\s]*(.+?)(?=name|customer|vehicle|passenger|luggage|price|\n)/i,
    /mobile[:\s]*(.+?)(?=name|customer|vehicle|passenger|luggage|price|\n)/i,
    /(\+\d{1,3}\s?\d{4}\s?\d{3}\s?\d{3})/,
    /(\d{5}\s?\d{6})/,
  ];

  private static vehiclePatterns = [
    /VEHICLE TYPE:\s*(.+?)(?=\n|miles|$)/i,
    /vehicle[:\s]*type[:\s]*(.+?)(?=passenger|luggage|price|special|mobility|\n)/i,
    /car[:\s]*type[:\s]*(.+?)(?=passenger|luggage|price|special|mobility|\n)/i,
    /(mpv|estate|saloon|executive|minibus|large\s*mpv)/i,
  ];

  private static passengerPatterns = [
    /TOTAL PAX:\s*(\d+)/i,
    /passenger[s]?[:\s]*(\d+)/i,
    /pax[:\s]*(\d+)/i,
  ];

  private static luggagePatterns = [
    /TOTAL LUGGAGE UNITS:\s*(\d+)/i,
    /luggage[:\s]*(\d+)/i,
    /bag[s]?[:\s]*(\d+)/i,
    /suitcase[s]?[:\s]*(\d+)/i,
  ];

  private static jobNumberPatterns = [
    /JOB NUMBER:\s*(\d+)/i,
    /job[:\s]*number[:\s]*(\d+)/i,
    /booking[:\s]*number[:\s]*(\d+)/i,
    /ref[:\s]*number[:\s]*(\d+)/i,
    /(\d{10})/,
  ];

  private static mobilityAidsPatterns = [
    /MOBILITY AIDS:\s*([^\n\r:]+)(?=\s*NAME:|$)/i,
    /mobility[:\s]+aids[:\s]*([^\n\r:]+?)(?=\s*name:|customer|passenger|$)/i,
  ];

  private static flightShipPatterns = [
    /FLIGHT\/SHIP:\s*([^\n\r]+)/i,
    /Flight Number\/Ship Name:\s*([^\n\r]+)/i,
    /flight[:\s]*number[:\s]*([^\n\r]+)/i,
    /ship[:\s]*name[:\s]*([^\n\r]+)/i,
  ];

  static extractFromEmail(emailContent: string): ExtractedJobData {
    const extracted: ExtractedJobData = {};
    const cleanContent = emailContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract date - handle both SAGA formats
    let dateMatch = cleanContent.match(/Date:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    if (!dateMatch) {
      dateMatch = cleanContent.match(/DATE:\s*\w+,?\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    }
    if (dateMatch) {
      extracted.date = this.formatDate(dateMatch[1]);
    }

    // Extract time
    for (const pattern of this.timePatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.time = match[1];
        break;
      }
    }

    // Extract pickup
    for (const pattern of this.pickupPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.pickup = match[1].trim().replace(/\n/g, ' ');
        break;
      }
    }

    // Extract destination and via points for multi-drop SAGA emails with location notes
    const dropOffResult = this.extractDropOffAddresses(cleanContent);
    console.log('🔍 DROP OFF ADDRESSES FOUND:', dropOffResult.addresses);
    console.log('📝 LOCATION NOTES FOUND:', dropOffResult.locationNotes);
    
    // Assign location notes to extracted data
    extracted.pickupNote = dropOffResult.locationNotes['pickup'];
    extracted.via1Note = dropOffResult.locationNotes['via1'];
    extracted.via2Note = dropOffResult.locationNotes['via2'];
    extracted.via3Note = dropOffResult.locationNotes['via3'];
    extracted.via4Note = dropOffResult.locationNotes['via4'];
    extracted.via5Note = dropOffResult.locationNotes['via5'];
    extracted.destinationNote = dropOffResult.locationNotes['destination'];
    
    if (dropOffResult.addresses.length > 0) {
      if (dropOffResult.addresses.length === 1) {
        // Single destination - no via points needed
        extracted.destination = dropOffResult.addresses[0];
        console.log('✅ SINGLE DESTINATION:', extracted.destination);
      } else if (dropOffResult.addresses.length > 1) {
        // Multiple drop-offs: first ones are via points, last is destination
        console.log('🚩 MULTIPLE DROP-OFFS DETECTED:', dropOffResult.addresses.length);
        for (let i = 0; i < dropOffResult.addresses.length - 1; i++) {
          if (i === 0) extracted.via1 = dropOffResult.addresses[i];
          else if (i === 1) extracted.via2 = dropOffResult.addresses[i];
          else if (i === 2) extracted.via3 = dropOffResult.addresses[i];
          else if (i === 3) extracted.via4 = dropOffResult.addresses[i];
          else if (i === 4) extracted.via5 = dropOffResult.addresses[i];
        }
        extracted.destination = dropOffResult.addresses[dropOffResult.addresses.length - 1];
        console.log('✅ VIA POINTS ASSIGNED:', { via1: extracted.via1, via2: extracted.via2, destination: extracted.destination });
      }
    }

    // ENHANCED CUSTOMER NAME EXTRACTION - Extract from most populated passenger field
    console.log('🧑‍🤝‍🧑 ENHANCED NAME EXTRACTION: Finding most populated passenger field...');
    
    // Step 1: Find all passenger sections with their passenger counts - SIMPLIFIED APPROACH
    const passengerSections = [];
    
    // Find all sections starting with "Pick up" or "Drop Off" followed by time
    const sectionMatches = cleanContent.match(/(Pick up|Drop Off)\s+\d{1,2}:\d{2}[\s\S]*?(?=Pick up|Drop Off|$)/gi);
    
    console.log(`🔍 SECTION MATCHES FOUND: ${sectionMatches ? sectionMatches.length : 0}`);
    if (sectionMatches) {
      sectionMatches.forEach((match, i) => {
        console.log(`📄 Section ${i + 1}: ${match.substring(0, 100)}...`);
      });
    }
    
    if (sectionMatches) {
      for (const section of sectionMatches) {
        // Extract time from section header
        const timeMatch = section.match(/(Pick up|Drop Off)\s+(\d{1,2}:\d{2})/i);
        if (!timeMatch) continue;
        
        const type = timeMatch[1].trim();
        const time = timeMatch[2].trim();
        
        // Extract passenger count
        const passengersMatch = section.match(/PASSENGERS:\s*(\d+)/i);
        const passengerCount = passengersMatch ? parseInt(passengersMatch[1]) || 0 : 0;
        
        // Extract names
        const namesMatch = section.match(/NAME:\s*([^|\n\r]+?)(?=\s*BOOKING|\s*PHONE|\s*INFO|\s*$)/i);
        const names = namesMatch ? namesMatch[1].trim() : '';
        
        if (passengerCount > 0 && names) {
          passengerSections.push({
            type,
            time,
            passengerCount,
            names,
            fullSection: section
          });
          
          console.log(`👥 Found section: ${type} ${time} - ${passengerCount} passengers - Names: "${names}"`);
        }
      }
    }
    
    // Step 2: Find the section with the most passengers
    let mostPopulatedSection = null;
    let maxPassengers = 0;
    
    for (const section of passengerSections) {
      if (section.passengerCount > maxPassengers) {
        maxPassengers = section.passengerCount;
        mostPopulatedSection = section;
      }
    }
    
    // Step 3: Extract names from the most populated section
    if (mostPopulatedSection) {
      console.log(`🎯 MOST POPULATED: ${mostPopulatedSection.type} ${mostPopulatedSection.time} with ${mostPopulatedSection.passengerCount} passengers`);
      
      let extractedNames = mostPopulatedSection.names;
      
      // Clean up names by removing unwanted suffixes
      extractedNames = extractedNames.replace(/\s*\|.*$/, ''); // Remove everything after |
      extractedNames = extractedNames.replace(/\s*BOOKING:.*$/, ''); // Remove everything after BOOKING:
      extractedNames = extractedNames.replace(/\s*PHONE:.*$/, ''); // Remove everything after PHONE:
      extractedNames = extractedNames.replace(/,\s*$/, ''); // Remove trailing comma
      
      // Only extract if it's valid customer names
      if (extractedNames && 
          !extractedNames.toLowerCase().includes('natural wonders') && 
          !extractedNames.toLowerCase().includes('iceland') &&
          !extractedNames.toLowerCase().includes('scandinavian') &&
          !extractedNames.toLowerCase().includes('tour') &&
          extractedNames.length > 3) {
        extracted.customerName = extractedNames;
        console.log(`✅ EXTRACTED NAMES from most populated field: "${extractedNames}"`);
        
        // Step 4: Extract AIDS from the same section
        const aidsMatch = mostPopulatedSection.fullSection.match(/MOBILITY AIDS:\s*([^|\n\r]*?)(?=\s*NAME|\s*BOOKING|\s*PHONE|\s*INFO|$)/i);
        
        if (aidsMatch) {
          let aids = aidsMatch[1].trim();
          // Clean AIDS field
          aids = aids.replace(/,\s*$/, ''); // Remove trailing comma
          aids = aids.replace(/^\s*-\s*/, ''); // Remove leading dash
          
          if (aids && aids !== '' && aids !== ':' && aids !== '-' && 
              !aids.toLowerCase().includes('none') &&
              !aids.toLowerCase().includes('mrs ') && 
              !aids.toLowerCase().includes('mr ') &&
              !aids.toLowerCase().includes('miss ') &&
              !aids.toLowerCase().includes('ms ')) {
            extracted.mobilityAids = aids;
            console.log(`🦽 EXTRACTED AIDS from most populated field: "${aids}"`);
          }
        }
      }
    }
    
    // FALLBACK: Use original extraction if enhanced method didn't work
    if (!extracted.customerName) {
      console.log('🔄 FALLBACK: Using original name extraction patterns...');
      
      for (const pattern of this.customerNamePatterns) {
        const match = cleanContent.match(pattern);
        if (match) {
          let name = match[1].trim();
          // Clean up name by removing any unwanted prefixes and suffixes
          name = name.replace(/^\(s\):\s*/, '');
          name = name.replace(/\s*\|.*$/, ''); // Remove everything after |
          name = name.replace(/\s*BOOKING:.*$/, ''); // Remove everything after BOOKING:
          name = name.replace(/\s*PHONE:.*$/, ''); // Remove everything after PHONE:
          
          // Only extract if it's a valid customer name (not tour names or other info)
          if (name && 
              !name.toLowerCase().includes('natural wonders') && 
              !name.toLowerCase().includes('iceland') &&
              !name.toLowerCase().includes('scandinavian') &&
              !name.toLowerCase().includes('tour') &&
              name.includes(' ') && 
              name.length > 3) {
            extracted.customerName = name;
            break;
          }
        }
      }

      // Additional extraction for SAGA format with "NAME:" labels (if first extraction didn't work)
      if (!extracted.customerName) {
        const namePattern = /NAME:\s*([^|\n]+?)(?=\s*BOOKING|\s*PHONE|\s*\||$)/i;
        const nameMatch = cleanContent.match(namePattern);
        if (nameMatch) {
          let name = nameMatch[1].trim();
          // Clean up name
          name = name.replace(/,\s*$/, ''); // Remove trailing comma
          
          // Only extract if it's a valid customer name
          if (name && 
              !name.toLowerCase().includes('natural wonders') && 
              !name.toLowerCase().includes('iceland') &&
              !name.toLowerCase().includes('scandinavian') &&
              !name.toLowerCase().includes('tour') &&
              name.includes(' ') && 
              name.length > 3) {
            extracted.customerName = name;
          }
        }
      }
    }

    // Extract phone numbers
    extracted.customerPhone = this.extractPriorityPhoneNumbers(cleanContent);

    // Extract vehicle type
    for (const pattern of this.vehiclePatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.vehicleType = match[1].trim();
        break;
      }
    }

    // Extract passengers
    for (const pattern of this.passengerPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.passengers = parseInt(match[1]);
        break;
      }
    }

    // Extract luggage
    for (const pattern of this.luggagePatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.luggage = parseInt(match[1]);
        break;
      }
    }

    // Extract mobility aids (skip customer names and flight/ship info)
    for (const pattern of this.mobilityAidsPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        const mobilityText = match[1].trim();
        
        // Only extract if it's not empty, generic values, customer names, or flight/ship info
        if (mobilityText && 
            mobilityText.length > 1 && // Must be more than 1 character to avoid ":" 
            !mobilityText.toLowerCase().includes('none') && 
            !mobilityText.toLowerCase().includes('n/a') &&
            !mobilityText.toLowerCase().includes('flight') &&
            !mobilityText.toLowerCase().includes('ship') &&
            !mobilityText.toLowerCase().includes('name:') &&
            !mobilityText.toLowerCase().includes('mrs ') &&
            !mobilityText.toLowerCase().includes('mr ') &&
            !mobilityText.toLowerCase().includes('miss ') &&
            !mobilityText.toLowerCase().includes('ms ') &&
            mobilityText !== '' &&
            mobilityText !== ':' &&
            mobilityText !== '-' &&
            mobilityText !== '0') {
          extracted.mobilityAids = mobilityText;
          break;
        }
      }
    }

    // Extract price - prioritize Job Price (without VAT) over Total Price for SAGA
    // Use the ordered pricePatterns array which prioritizes Job Price first
    for (const pattern of this.pricePatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.price = match[1];
        break;
      }
    }

    // Extract job number
    for (const pattern of this.jobNumberPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        extracted.jobNumber = match[1];
        break;
      }
    }



    // Extract flight/ship information using new patterns
    let flightShipInfo = '';
    for (const pattern of this.flightShipPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        flightShipInfo = match[1]
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .trim()
          .replace(/^\s*-\s*/, '') // Remove leading dash and spaces
          .replace(/\s*$/, ''); // Remove trailing spaces
        
        if (flightShipInfo && flightShipInfo !== '' && flightShipInfo !== '-') {
          break;
        }
      }
    }

    // Build driver notes - exclude customer names as they go in the Name field
    const driverNoteParts = [];
    if (extracted.vehicleType) driverNoteParts.push(`Vehicle: ${extracted.vehicleType}`);
    if (extracted.passengers) driverNoteParts.push(`Passengers: ${extracted.passengers}`);
    if (extracted.luggage !== undefined) driverNoteParts.push(`Luggage: ${extracted.luggage}`);
    
    // Add mobility aids if present (but not customer names, flight/ship info, or empty values)
    if (extracted.mobilityAids && 
        extracted.mobilityAids.trim() !== '' &&
        extracted.mobilityAids !== ':' &&
        extracted.mobilityAids !== '-' &&
        extracted.mobilityAids !== '0' &&
        !extracted.mobilityAids.toLowerCase().includes('none') &&
        !extracted.mobilityAids.toLowerCase().includes('mrs ') && 
        !extracted.mobilityAids.toLowerCase().includes('mr ') &&
        !extracted.mobilityAids.toLowerCase().includes('miss ') &&
        !extracted.mobilityAids.toLowerCase().includes('ms ')) {
      driverNoteParts.push(`Aids: ${extracted.mobilityAids}`);
    }
    
    // Add flight/ship information if found
    if (flightShipInfo) {
      driverNoteParts.push(`Flight/Ship: ${flightShipInfo}`);
    }
    
    if (driverNoteParts.length > 0) {
      extracted.driverNotes = driverNoteParts.join(', ');
    }

    return extracted;
  }

  private static extractDropOffAddresses(emailContent: string): {addresses: string[], locationNotes: {[key: string]: string}} {
    const addresses: string[] = [];
    const locationNotes: {[key: string]: string} = {};
    console.log('🔍 EXTRACTING ALL ADDRESSES from SAGA email (pickups + drop offs)...');
    
    // Enhanced method: Extract ALL sections with full passenger information
    // Handle both formats: "Pick up 10:05" and just "Drop Off" (without time)
    const sectionRegex = /(Pick up|Drop Off)(?:\s+(\d{1,2}:\d{2}))?[\s\S]*?(?=Pick up|Drop Off|$)/gi;
    let match;
    const sectionsWithData: { time: string, address: string, type: string, fullSection: string }[] = [];
    
    let dropOffCounter = 0;
    let pickupTime = "10:05"; // Default pickup time
    
    while ((match = sectionRegex.exec(emailContent)) !== null) {
      const type = match[1].trim(); // "Pick up" or "Drop Off"
      let time;
      
      if (match[2]) {
        // Explicit time found
        time = match[2].trim();
        if (type === "Pick up") {
          pickupTime = time; // Store pickup time for Drop Off sections
        }
      } else {
        // No explicit time - assign sequential times for Drop Off sections
        if (type === "Drop Off") {
          dropOffCounter++;
          const [hours, minutes] = pickupTime.split(':').map(Number);
          const dropOffMinutes = minutes + (dropOffCounter * 30); // 30 minutes between each drop off
          const dropOffHours = hours + Math.floor(dropOffMinutes / 60);
          time = `${(dropOffHours % 24).toString().padStart(2, '0')}:${(dropOffMinutes % 60).toString().padStart(2, '0')}`;
        } else {
          time = pickupTime;
        }
      }
      
      const fullSection = match[0]; // Complete section
      
      // Extract address from section
      const addressMatch = fullSection.match(/ADDRESS:\s*([^\n\r]+)/i);
      if (addressMatch) {
        const address = addressMatch[1].trim();
        console.log(`🕐 FOUND ${type} at ${time}: ${address}`);
        sectionsWithData.push({ time, address, type, fullSection });
      }
    }
    
    // Sort by time to get correct order
    sectionsWithData.sort((a, b) => {
      const timeA = a.time.split(':').map(n => parseInt(n));
      const timeB = b.time.split(':').map(n => parseInt(n));
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
    
    console.log('📅 ADDRESSES SORTED BY TIME:', sectionsWithData.map(s => ({time: s.time, address: s.address, type: s.type})));
    
    // First section is pickup, extract its note
    if (sectionsWithData.length > 0) {
      const pickupNote = this.extractLocationNote(sectionsWithData[0].fullSection);
      if (pickupNote) {
        locationNotes['pickup'] = pickupNote;
        console.log(`📝 PICKUP NOTE: ${pickupNote}`);
      }
    }
    
    // Extract addresses and notes (skip first pickup, include subsequent pickups as via points, include all drop offs)
    for (let i = 1; i < sectionsWithData.length; i++) {
      const section = sectionsWithData[i];
      if (!addresses.includes(section.address)) {
        addresses.push(section.address);
        console.log(`🏃 ADDED ADDRESS ${addresses.length}: ${section.address}`);
        
        // Extract note for this location
        const note = this.extractLocationNote(section.fullSection);
        if (note) {
          if (i === sectionsWithData.length - 1) {
            // Last address is destination
            locationNotes['destination'] = note;
            console.log(`📝 DESTINATION NOTE: ${note}`);
          } else {
            // Via point - addresses.length is the current via point number
            locationNotes[`via${addresses.length}`] = note;
            console.log(`📝 VIA${addresses.length} NOTE: ${note}`);
          }
        }
        
        console.log(`✅ ADDED to via/destination list: ${section.address} (${section.type} at ${section.time})`);
      }
    }
    
    // Fallback to original method if no addresses found with new method
    if (addresses.length === 0) {
      console.log('🔄 FALLING BACK to original Collection Type method...');
      const dropOffSections = emailContent.split(/Collection Type:\s+Drop Off/gi);
      
      for (let i = 1; i < dropOffSections.length; i++) {
        const section = dropOffSections[i];
        const addressMatch = section.match(/Address:\s*([^\n\r]+)/i);
        if (addressMatch) {
          const address = addressMatch[1].trim();
          if (address && !addresses.includes(address)) {
            addresses.push(address);
            console.log(`✅ FALLBACK ADDRESS FOUND:`, address);
          }
        }
      }
    }
    
    console.log('🏁 FINAL VIA + DESTINATION ADDRESSES:', addresses);
    console.log('📝 LOCATION NOTES:', locationNotes);
    return { addresses, locationNotes };
  }

  private static extractLocationNote(sectionContent: string): string {
    // Extract passenger names and phone numbers from section
    const names: string[] = [];
    const phones: string[] = [];
    
    // Extract names
    const nameMatch = sectionContent.match(/NAME:\s*([^|\n\r]+?)(?=\s*BOOKING|\s*PHONE|\s*INFO|\s*$)/i);
    if (nameMatch) {
      const nameText = nameMatch[1].trim();
      if (nameText && !nameText.toLowerCase().includes('tour') && !nameText.toLowerCase().includes('iceland')) {
        names.push(nameText);
      }
    }
    
    // Extract phone numbers - look for PHONE: pattern and get ALL numbers
    console.log(`🔍 EXTRACTING PHONES from section: ${sectionContent.substring(0, 200)}...`);
    
    const phoneMatches = [
      ...sectionContent.matchAll(/BOOKING:[^|]*\|\s*PHONE:\s*([^|\n\r]+)/gi), // "BOOKING: XXX | PHONE: numbers"
      ...sectionContent.matchAll(/PHONE:\s*([^|\n\r]+)/gi),                    // Direct "PHONE: numbers" 
      ...sectionContent.matchAll(/\|\s*PHONE:\s*([^|\n\r]+)/gi),             // "| PHONE: numbers"
      ...sectionContent.matchAll(/(\+?44\s*\d{4,5}\s*\d{6}|07\d{9}|01\d{9}|02\d{8})/g) // Direct number patterns
    ];
    
    console.log(`📞 PHONE MATCHES FOUND: ${phoneMatches.length}`);
    
    const uniquePhones = new Set<string>();
    phoneMatches.forEach((match, index) => {
      const phoneText = match[1]?.trim() || match[0]?.trim();
      console.log(`📞 Processing match ${index}: "${phoneText}"`);
      
      if (phoneText && phoneText.length > 5) {
        // Split by / and spaces to get individual numbers
        const individualNumbers = phoneText.split(/[\/\s]+/).map(num => num.trim().replace(/[^0-9]/g, ''));
        console.log(`📞 Individual numbers: ${JSON.stringify(individualNumbers)}`);
        
        individualNumbers.forEach(cleanNum => {
          // Handle SAGA format missing leading zeros (e.g., 1277899076 instead of 01277899076)
          let processedNum = cleanNum;
          
          // Add leading zero for 10-digit numbers that should be 11-digit UK numbers
          if (cleanNum.length === 10) {
            if (cleanNum.startsWith('7')) {
              processedNum = '0' + cleanNum; // Mobile: 7935682580 → 07935682580
            } else if (cleanNum.startsWith('1') || cleanNum.startsWith('2')) {
              processedNum = '0' + cleanNum; // Landline: 1277899076 → 01277899076
            }
          }
          
          if (processedNum.length === 11) {
            // Convert to international format for AUTOCAB
            if (processedNum.startsWith('07')) {
              const intlNumber = `+44${processedNum.substring(1)}`;
              uniquePhones.add(intlNumber);
              console.log(`📞 Added mobile: ${intlNumber} (from ${cleanNum})`);
            } else if (processedNum.startsWith('01') || processedNum.startsWith('02')) {
              const intlNumber = `+44${processedNum.substring(1)}`;
              uniquePhones.add(intlNumber);
              console.log(`📞 Added landline: ${intlNumber} (from ${cleanNum})`);
            }
          }
        });
      }
    });
    
    // For address notes, we can include ALL phone numbers (no AUTOCAB limit)
    const allPhones = Array.from(uniquePhones);
    
    // Build note for AUTOCAB address note field (no character limit for individual addresses)
    const noteParts: string[] = [];
    if (names.length > 0) {
      // Include all passenger names for this location
      noteParts.push(names[0]);
      console.log(`📝 Added name: ${names[0]}`);
    }
    if (allPhones.length > 0) {
      // Include ALL phone numbers for this specific passenger/location
      noteParts.push(allPhones.join(', '));
      console.log(`📞 Added phones: ${allPhones.join(', ')}`);
    }
    
    const finalNote = noteParts.join(' - ');
    console.log(`📝 FINAL NOTE: "${finalNote}"`);
    
    // Return format: "Passenger Name - +44XXXXXXXXX, +44XXXXXXXXX" with international formatting
    return finalNote;
  }

  private static extractPriorityPhoneNumbers(content: string): string {
    const mobileNumbers: string[] = [];
    const fixedNumbers: string[] = [];
    
    // First, extract job number to exclude it from phone extraction
    const jobNumberMatch = content.match(/JOB NUMBER:\s*(\d+)/i);
    const jobNumber = jobNumberMatch ? jobNumberMatch[1] : '';
    
    // Enhanced phone extraction for SAGA format: PHONE: 01622858998 / 01474705123 / 7890120658
    const phoneLineMatches = content.match(/PHONE:\s*([0-9\/\s]+?)(?:\s*\n|\s*\||$)/gi);
    
    if (phoneLineMatches) {
      phoneLineMatches.forEach(phoneLineText => {
        // Extract the phone number part after "PHONE:"
        const phoneNumbersText = phoneLineText.replace(/PHONE:\s*/i, '').trim();
        
        // Split by / and process each number
        const phoneNumbers = phoneNumbersText.split('/').map(num => num.trim());
        
        phoneNumbers.forEach(num => {
          // Clean the number - remove any non-digit characters
          const cleanNum = num.replace(/[^0-9]/g, '');
          
          // Skip if it's the job number or booking number
          if (cleanNum === jobNumber || cleanNum.startsWith('11120815')) {
            return;
          }
          
          // Process phone numbers
          if (cleanNum.length >= 10) {
            let formattedNum = cleanNum;
            
            // Handle 10-digit numbers (add leading 0)
            if (cleanNum.length === 10) {
              if (cleanNum.startsWith('7')) {
                formattedNum = '0' + cleanNum; // Mobile
              } else if (cleanNum.startsWith('1') || cleanNum.startsWith('2')) {
                formattedNum = '0' + cleanNum; // Fixed line
              }
            }
            
            // Categorize 11-digit numbers
            if (formattedNum.length === 11) {
              if (formattedNum.startsWith('07')) {
                mobileNumbers.push(formattedNum);
              } else if (formattedNum.startsWith('01') || formattedNum.startsWith('02')) {
                fixedNumbers.push(formattedNum);
              }
            }
          }
        });
      });
    }
    
    // Fallback: use old extraction method if no PHONE: lines found
    if (mobileNumbers.length === 0 && fixedNumbers.length === 0) {
      const phoneMatches = content.match(/\b(0[0-9]{10}|[0-9]{10})\b/g);
      if (phoneMatches) {
        phoneMatches.forEach(num => {
          const cleanNum = num.trim();
          // Exclude job numbers, booking numbers, dates
          if (cleanNum !== jobNumber && 
              !cleanNum.startsWith('11120815') && 
              !cleanNum.startsWith('2025') && 
              cleanNum.length >= 10) {
            
            let processedNum = cleanNum;
            if (cleanNum.length === 10) {
              if (cleanNum.startsWith('7')) {
                processedNum = '0' + cleanNum;
              } else if (cleanNum.startsWith('1') || cleanNum.startsWith('2')) {
                processedNum = '0' + cleanNum;
              }
            }
            
            if (processedNum.length === 11) {
              if (processedNum.startsWith('07')) {
                mobileNumbers.push(processedNum);
              } else if (processedNum.startsWith('01') || processedNum.startsWith('02')) {
                fixedNumbers.push(processedNum);
              }
            }
          }
        });
      }
    }
    
    // Remove duplicates and prioritize: mobile first, then fixed, max 3 total
    const uniqueMobile = mobileNumbers.filter((num, index) => mobileNumbers.indexOf(num) === index);
    const uniqueFixed = fixedNumbers.filter((num, index) => fixedNumbers.indexOf(num) === index);
    const combinedNumbers = uniqueMobile.concat(uniqueFixed);
    
    return combinedNumbers.slice(0, 3).join(', ');
  }

  private static formatDate(dateStr: string): string {
    const monthNames: Record<string, string> = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    
    const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = monthNames[match[2].toLowerCase()] || '01';
      const year = match[3];
      return `${day}/${month}/${year}`;
    }
    
    return dateStr;
  }
}