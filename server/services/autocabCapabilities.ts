// Autocab Capabilities Service
// Handles intelligent capability selection based on passengers and luggage

export interface AutocabCapability {
  id: number;
  rowVersion: number;
  shortCode: string;
  name: string;
  requirement: string;
  priority: number;
  enabled: boolean;
  colour: { r: number; g: number; b: number } | null;
  excludeFromBroadcast: boolean;
  exclusiveCapability: boolean;
  operatorOverride: boolean;
}

// Fetch all capabilities from Autocab API
export async function getAutocabCapabilities(): Promise<AutocabCapability[]> {
  try {
    const apiKey = process.env.AUTOCAB_API_KEY;
    if (!apiKey) {
      console.log('⚠️ No Autocab API key available');
      return [];
    }

    const response = await fetch('https://autocab-api.azure-api.net/booking/v1/capabilities', {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const capabilities = await response.json();
      console.log(`✅ Retrieved ${capabilities.length} capabilities from Autocab`);
      return capabilities;
    } else {
      console.log(`❌ Failed to fetch capabilities: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching capabilities:', error);
    return [];
  }
}

// Intelligent capability selection based on passengers and luggage
export function selectCapabilityForBooking(passengers: number, luggage: number, vehicleType?: string): number[] {
  console.log(`🎯 Selecting capability for: ${passengers} passengers, ${luggage} luggage, vehicle: ${vehicleType}`);
  
  const capabilities: number[] = [];
  
  // For passengers 1-4 with minimal luggage: Saloon (10) or Estate (8)
  if (passengers <= 4 && luggage <= 2) {
    if (vehicleType === 'Estate' || luggage >= 3) {
      capabilities.push(8); // Estate capability ID (E)
      console.log('✅ Selected Estate (8) - More luggage space needed');
    } else if (vehicleType === 'Saloon' || !vehicleType) {
      capabilities.push(10); // Saloon capability ID (S)
      console.log('✅ Selected Saloon (10) - Standard car');
    }
  }
  
  // For more luggage (3-5 bags): Estate (8)
  else if (passengers <= 4 && luggage >= 3 && luggage <= 5) {
    capabilities.push(8); // Estate capability ID (E)
    console.log('✅ Selected Estate (8) - More luggage space needed');
  }
  
  // For 5 passengers: 5 seater capability
  else if (passengers === 5) {
    capabilities.push(5); // 5 seater capability ID (5)
    console.log('✅ Selected 5 seater (5) - 5 passengers');
  }
  
  // For 6 passengers: 6 seater capability
  else if (passengers === 6) {
    capabilities.push(2); // 6 seater capability ID (6)
    console.log('✅ Selected 6 seater (2) - 6 passengers');
  }
  
  // For 7 passengers: 7 seater capability
  else if (passengers === 7) {
    capabilities.push(3); // 7 seater capability ID (7)
    console.log('✅ Selected 7 seater (3) - 7 passengers');
  }
  
  // For 8 passengers: 8 seater capability
  else if (passengers === 8) {
    capabilities.push(4); // 8 seater capability ID (8)
    console.log('✅ Selected 8 seater (4) - 8 passengers');
  }
  
  // For wheelchair access
  if (vehicleType === 'Wheelchair' || vehicleType === 'Disabled') {
    capabilities.push(7); // Wheelchair capability ID (W)
    console.log('✅ Added Wheelchair access (7) - Disability access needed');
  }
  
  // For pets
  if (vehicleType === 'Pets') {
    capabilities.push(13); // Pets capability ID (D)
    console.log('✅ Added Pets (13) - Pet transport needed');
  }
  
  // For executive/luxury
  if (vehicleType === 'Executive' || vehicleType === 'Luxury') {
    capabilities.push(9); // Executive capability ID (X)
    console.log('✅ Added Executive (9) - Luxury transport needed');
  }
  
  console.log(`🎯 Final capabilities selected: [${capabilities.join(', ')}]`);
  return capabilities;
}

// Convert vehicle type to capability shortcode
export function vehicleTypeToCapability(vehicleType: string): string[] {
  const type = vehicleType.toLowerCase();
  
  switch (type) {
    case 'saloon':
      return ['S'];
    case 'estate':
      return ['E'];
    case 'mpv':
    case 'large mpv':
      return ['6']; // Default to 6 seater for MPV
    case 'wheelchair':
    case 'disabled':
      return ['W'];
    case 'executive':
    case 'luxury':
      return ['X'];
    case 'pets':
      return ['P'];
    default:
      return ['S']; // Default to Saloon
  }
}

// Get capability name from shortcode
export function getCapabilityName(shortCode: string): string {
  const capabilityMap: { [key: string]: string } = {
    'S': 'Saloon car',
    'E': 'Estate',
    '4': '4 seater',
    '5': '5 seater',
    '6': '6 seater',
    '7': '7 seater',
    '8': '8 seater',
    'W': 'Wheelchair access',
    'P': 'Pets',
    'X': 'Executive car',
    'D': 'Pets',
    'R': 'Removal'
  };
  
  return capabilityMap[shortCode] || shortCode;
}

// Sarah's intelligent questions for capability selection
export function getCapabilityQuestions(passengers?: number, luggage?: number, vehicleType?: string): string[] {
  const questions: string[] = [];
  
  // Always ask for basic info if missing
  if (!passengers) {
    questions.push("How many passengers will be traveling?");
  }
  
  if (!luggage) {
    questions.push("How many bags/luggage items do you have?");
  }
  
  // If we have passengers but no vehicle type, make intelligent suggestions
  if (passengers && !vehicleType) {
    if (passengers <= 4) {
      questions.push("What type of vehicle do you need? (Saloon for standard, Estate for more luggage space)");
    } else if (passengers >= 5) {
      questions.push(`For ${passengers} passengers, you'll need a larger vehicle. Is that correct?`);
    }
  }
  
  return questions;
}

// Get pricing modifier based on capability
export function getCapabilityPricing(capabilities: number[]): string {
  if (capabilities.includes(9)) return 'Executive pricing';
  if (capabilities.includes(7)) return 'Wheelchair accessible pricing';
  if (capabilities.includes(4)) return '8 seater pricing';
  if (capabilities.includes(3)) return '7 seater pricing';
  if (capabilities.includes(2)) return '6 seater pricing';
  if (capabilities.includes(5)) return '5 seater pricing';
  if (capabilities.includes(8)) return 'Estate pricing';
  if (capabilities.includes(10)) return 'Saloon pricing';
  return 'Standard pricing';
}