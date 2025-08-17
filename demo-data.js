// Demo script to populate the application with sample data
const jobsData = [
  {
    jobNumber: "1106250007",
    date: "2025-06-26",
    time: "09:00",
    pickup: "Cruise Terminal One, Dover Western Docks, Dover, Kent, CT17 9DQ",
    destination: "2, Chesham Crescent, London, SE20 7RL",
    customerName: "Full name",
    customerPhone: "Phone numbers (separated by comma)",
    customerAccount: "SOH - Saga",
    customerReference: "1807250084",
    passengers: 2,
    luggage: 2,
    vehicleType: "MPV Estate",
    mobilityAids: "wheelchair salon",
    capabilities: "W, E, P",
    price: "177.25",
    driverNotes: "Vehicle Type: MPV, Estate, Passengers: 2, Luggage: 2, Mobility Aids: wheelchair salon",
    status: "pending",
    distance: "70.9 mi",
    duration: "93 min",
    waypoints: 0,
    sentToAutocab: false
  },
  {
    jobNumber: "1106250014",
    date: "2025-06-26",
    time: "08:20",
    pickup: "London Heathrow Airport, Terminal 5",
    destination: "Brighton Marina Village",
    customerName: "John Smith",
    customerPhone: "07123456789",
    customerAccount: "CORP - Corporate",
    customerReference: "HTW2025001",
    passengers: 1,
    luggage: 1,
    vehicleType: "Estate/Sm",
    price: "65.00",
    status: "completed",
    distance: "45.2 mi",
    duration: "67 min",
    waypoints: 0,
    sentToAutocab: true
  },
  {
    jobNumber: "1106250019",
    date: "2025-06-26",
    time: "08:25",
    pickup: "Canterbury Cathedral Lodge",
    destination: "Dover Ferry Terminal",
    customerName: "Sarah Johnson",
    customerPhone: "07987654321",
    customerAccount: "SOH - Saga",
    customerReference: "CAN2025002",
    passengers: 3,
    luggage: 4,
    vehicleType: "Saloon",
    price: "65.00",
    status: "pending",
    distance: "22.3 mi",
    duration: "35 min",
    waypoints: 1,
    sentToAutocab: false
  },
  {
    jobNumber: "1106250020",
    date: "2025-06-26",
    time: "08:30",
    pickup: "Royal Tunbridge Wells Station",
    destination: "Gatwick Airport South Terminal",
    customerName: "Michael Brown",
    customerPhone: "07456789123",
    customerAccount: "CASH - Cash Payment",
    passengers: 2,
    luggage: 3,
    vehicleType: "Saloon",
    price: "65.00",
    status: "in-progress",
    distance: "28.7 mi",
    duration: "42 min",
    waypoints: 0,
    sentToAutocab: true
  },
  {
    jobNumber: "1106250031",
    date: "2025-06-26",
    time: "08:30",
    pickup: "Maidstone East Station",
    destination: "London Victoria Coach Station",
    customerName: "Emma Wilson",
    customerPhone: "07321654987",
    customerAccount: "SOH - Saga",
    customerReference: "MAI2025003",
    passengers: 1,
    luggage: 2,
    vehicleType: "Estate/Sm",
    price: "65.00",
    status: "completed",
    distance: "38.1 mi",
    duration: "55 min",
    waypoints: 0,
    sentToAutocab: true
  }
];

// Function to create jobs via API
async function createDemoJobs() {
  for (const jobData of jobsData) {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      });
      
      if (response.ok) {
        console.log(`Created job: ${jobData.jobNumber}`);
      } else {
        console.error(`Failed to create job: ${jobData.jobNumber}`);
      }
    } catch (error) {
      console.error(`Error creating job ${jobData.jobNumber}:`, error);
    }
  }
}

// Auto-run when script is loaded in browser console
if (typeof window !== 'undefined') {
  createDemoJobs();
}