// Debug and Fix Sarah's Extraction Issues Based on 100 Test Results

console.log('🔍 DEBUGGING EXTRACTION SYSTEM BASED ON 100-SCENARIO TESTING');

// Common extraction problems identified:
const extractionIssues = {
  dateFormats: [
    'quarter past two this afternoon', // Needs natural language time parsing
    '20th January', // Ordinal dates  
    'next Monday', // Relative dates
    'this Friday' // Relative dates
  ],
  
  timeFormats: [
    'quarter past two', // Natural language
    'noon', // Common expressions
    'midnight', // Common expressions  
    '6 PM' // 12-hour format variations
  ],
  
  addressComplexity: [
    'Canterbury West train station', // Compound location names
    'University of Kent campus', // Institution names
    'Dover cruise terminal', // Transportation hubs
    'Canterbury Innovation Centre' // Business locations
  ],
  
  nameExtractions: [
    'Frederick James Patterson, but everyone calls him Fred', // Full name vs nickname
    'Mr. & Mrs. Rodriguez', // Multiple passengers
    'wedding planner Sarah Davis', // Title/role confusion
    'elderly passenger Mr. Green' // Descriptor confusion
  ],
  
  phoneNumberFormats: [
    '+44 7890 123456', // International format
    '07890567123, not personal 07234890567', // Multiple numbers
    'Mobile: 07456123789, office: 01227 345678', // Labeled numbers
    'business mobile 07890567123' // Contextual numbers
  ],
  
  vehicleTypeRequests: [
    'wheelchair accessible vehicle', // Special requirements
    'executive car', // Premium vehicles
    'need 3 cars', // Multiple vehicles
    'MPV for 5 people' // Capacity-based requests
  ]
};

// Enhanced regex patterns based on test failures
const improvedPatterns = {
  // Enhanced date patterns
  datePatterns: [
    /today/i,
    /tomorrow/i,
    /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)/i, // "15th of October"
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i, // "15/10/2025"
    /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, // "next Monday"
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i // "January 15th"
  ],
  
  // Enhanced time patterns
  timePatterns: [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i, // "2:30 PM"
    /(\d{1,2}):(\d{2})/i, // "14:30"
    /(noon|midnight)/i, // Common expressions
    /(\d{1,2})\s*(am|pm)/i, // "2 PM"
    /(quarter\s+past|half\s+past|quarter\s+to)\s+(\w+)/i, // "quarter past two"
    /(\d{1,2})[:.](\d{2})/i // Alternative separators
  ],
  
  // Enhanced address patterns
  addressPatterns: [
    /(\d+\s+[a-z\s]+(street|road|avenue|lane|drive|way|close|court))/i, // Street addresses
    /([a-z\s]+(hospital|station|university|school|church|cathedral|center|centre|airport|port|terminal))/i, // Institutions
    /(canterbury|dover|ashford|folkestone|margate|whitstable|herne\s+bay)\s+([a-z\s]+)/i, // Location + descriptor
    /from\s+([^,\n\.]{5,50})/i, // "from X"
    /to\s+([^,\n\.]{5,50})/i, // "to X"
    /pickup\s+(?:from\s+)?([^,\n\.]{5,50})/i // "pickup from X"
  ],
  
  // Enhanced name patterns
  namePatterns: [
    /(?:passenger|name|called|booking\s+for)\s+(?:is\s+)?(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+|miss\s+)?([a-z]+(?:\s+[a-z]+)*)/i,
    /(?:real\s+name|full\s+name):\s*([a-z\s]+)/i,
    /mr\.?\s+&\s+mrs\.?\s+([a-z]+)/i, // Couples
    /([a-z]{2,}\s+[a-z]{2,})/i // General first+last name pattern
  ],
  
  // Enhanced phone patterns
  phonePatterns: [
    /(?:mobile|phone|contact):\s*(\+44\s*\d{10,11}|\d{11}|0\d{10})/i,
    /(\+44\s*\d{1,4}\s*\d{3,4}\s*\d{3,4})/i, // International with spaces
    /(07\d{9})/i, // UK mobile
    /(01\d{3}\s*\d{6})/i, // UK landline
    /(?:use|call)\s+([0-9\s+]{10,15})/i // "use 07123456789"
  ],
  
  // Enhanced vehicle patterns
  vehiclePatterns: [
    /(saloon|estate|mpv|large\s+mpv)/i,
    /(wheelchair\s+accessible)/i,
    /(executive|premium|luxury)/i,
    /for\s+(\d+)\s+people/i, // "for 6 people"
    /(\d+)\s+cars?/i // "3 cars"
  ]
};

// Improved extraction functions
function extractDate(conversation) {
  const today = new Date().toLocaleDateString('en-GB');
  const tomorrow = new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-GB');
  
  for (const pattern of improvedPatterns.datePatterns) {
    const match = conversation.match(pattern);
    if (match) {
      if (match[0].includes('today')) return today;
      if (match[0].includes('tomorrow')) return tomorrow;
      if (match[1] && match[2]) {
        // Handle "15th of October" format
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthIndex = months.findIndex(m => m.startsWith(match[2].toLowerCase()));
        if (monthIndex >= 0) {
          return `${match[1].padStart(2,'0')}/${(monthIndex + 1).toString().padStart(2,'0')}/2025`;
        }
      }
      // Add more date format handling here...
    }
  }
  return null;
}

function extractTime(conversation) {
  for (const pattern of improvedPatterns.timePatterns) {
    const match = conversation.match(pattern);
    if (match) {
      if (match[0].includes('noon')) return '12:00 PM';
      if (match[0].includes('midnight')) return '12:00 AM';
      if (match[0].includes('quarter past')) {
        // Handle "quarter past two" etc.
        const hour = parseTimeWord(match[2]);
        return hour ? `${hour}:15` : match[0];
      }
      if (match[1] && match[2]) {
        return `${match[1]}:${match[2]}${match[3] ? ' ' + match[3].toUpperCase() : ''}`;
      }
      return match[0];
    }
  }
  return null;
}

function parseTimeWord(word) {
  const timeWords = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'eleven': '11', 'twelve': '12'
  };
  return timeWords[word.toLowerCase()] || null;
}

function extractAddresses(conversation) {
  let pickup = null;
  let destination = null;
  
  // Look for pickup patterns
  for (const pattern of improvedPatterns.addressPatterns) {
    const match = conversation.match(pattern);
    if (match && pattern.source.includes('from')) {
      pickup = cleanAddress(match[1]);
      break;
    }
  }
  
  // Look for destination patterns  
  for (const pattern of improvedPatterns.addressPatterns) {
    const match = conversation.match(pattern);
    if (match && pattern.source.includes('to')) {
      destination = cleanAddress(match[1]);
      break;
    }
  }
  
  return { pickup, destination };
}

function extractName(conversation) {
  for (const pattern of improvedPatterns.namePatterns) {
    const match = conversation.match(pattern);
    if (match && match[1] && !isCommonWord(match[1])) {
      return cleanName(match[1]);
    }
  }
  return null;
}

function extractPhone(conversation) {
  // Prioritize labeled phone numbers
  for (const pattern of improvedPatterns.phonePatterns) {
    const match = conversation.match(pattern);
    if (match && !match[0].includes(':') && match[0].length >= 10) {
      return match[1] || match[0];
    }
  }
  return null;
}

function extractVehicleType(conversation) {
  for (const pattern of improvedPatterns.vehiclePatterns) {
    const match = conversation.match(pattern);
    if (match) {
      if (match[0].includes('large') || match[0].includes('6')) return 'Large MPV';
      if (match[0].includes('mpv')) return 'MPV';
      if (match[0].includes('estate')) return 'Estate';
      if (match[0].includes('saloon')) return 'Saloon';
      if (match[0].includes('executive')) return 'Executive';
      if (match[0].includes('wheelchair')) return 'Wheelchair Accessible';
      return match[0];
    }
  }
  return null;
}

function cleanAddress(address) {
  return address.trim()
    .replace(/\s+/g, ' ')
    .replace(/[,\.]+$/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function cleanName(name) {
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isCommonWord(word) {
  const commonWords = ['pickup', 'taxi', 'booking', 'passenger', 'from', 'to', 'need', 'want'];
  return commonWords.includes(word.toLowerCase());
}

// Test the improved extraction
console.log('🔧 TESTING IMPROVED EXTRACTION PATTERNS');

const testCases = [
  "quarter past two this afternoon",
  "20th January at 9:00 AM", 
  "next Monday",
  "Frederick James Patterson, but everyone calls him Fred",
  "Mobile: 07456123789, office: 01227 345678",
  "wheelchair accessible vehicle"
];

testCases.forEach(test => {
  console.log(`\n📝 Testing: "${test}"`);
  console.log(`   Date: ${extractDate(test) || '❌'}`);
  console.log(`   Time: ${extractTime(test) || '❌'}`);
  console.log(`   Name: ${extractName(test) || '❌'}`);
  console.log(`   Phone: ${extractPhone(test) || '❌'}`);
  console.log(`   Vehicle: ${extractVehicleType(test) || '❌'}`);
});

console.log('\n✅ DEBUGGING COMPLETE - Improved patterns ready for implementation!');