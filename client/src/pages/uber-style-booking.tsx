import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Clock, Car, User, Phone, CreditCard, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { SimpleBookingMap } from '@/components/map/simple-booking-map';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useJobs } from '@/hooks/use-jobs';
import { useAutocab } from '@/hooks/use-autocab';

interface JobData {
  pickup: string;
  destination: string;
  viaPoints?: string[];
  dateTime: string;
  customerName: string;
  phoneNumbers: string;
  passengerCount: string;
  luggageCount: string;
  vehicleType: string;
  price: string;
  driverNotes: string;
}

export default function UberStyleBooking() {
  const [currentStep, setCurrentStep] = useState<'pickup' | 'destination' | 'vehicle' | 'details' | 'confirm'>('pickup');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPinLocation, setPendingPinLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{lat: number, lng: number} | null>(null);
  const [autoExtractTimer, setAutoExtractTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDetectingPhone, setIsDetectingPhone] = useState(false);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  
  const [jobData, setJobData] = useState<JobData>({
    pickup: '',
    destination: '',
    viaPoints: [],
    dateTime: 'ASAP',
    customerName: '',
    phoneNumbers: '',
    passengerCount: '1',
    luggageCount: '0',
    vehicleType: 'Saloon',
    price: '',
    driverNotes: ''
  });
  const [selectedCategory, setSelectedCategory] = useState<'recommended' | 'family' | 'special'>('recommended');

  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: string; duration: string; price: number } | null>(null);

  const { createJob } = useJobs();
  const { sendToAutocab, checkDuplicate } = useAutocab();

  // Auto-detect user location on page load
  useEffect(() => {
    const detectUserLocation = () => {
      if (!navigator.geolocation) {
        console.log('📍 Geolocation nu este suportat de browser');
        alert('Browserul nu suportă detectarea GPS. Vă rugăm să introduceți manual adresa.');
        return;
      }

      setIsLoadingLocation(true);
      console.log('🌍 Detectez locația utilizatorului...');
      
      // Show user what we're doing
      console.log('🔍 Solicitare permisiune GPS...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setUserLocation(userCoords);
          setIsLoadingLocation(false);
          
          console.log('✅ GPS DETECTAT CU SUCCES!', userCoords);
          console.log(`📍 Prioritizare căutări în jurul locației: ${userCoords.lat}, ${userCoords.lng}`);
          
          // Visual feedback to user
          alert(`GPS detectat! Coordonate: ${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}\n\nAcum sugestiile de adrese vor fi prioritizate în zona dumneavoastră.`);
        },
        (error) => {
          setIsLoadingLocation(false);
          console.log('❌ EROARE GPS:', error.message);
          console.log('📍 Folosesc Canterbury ca fallback pentru căutări');
          
          // More detailed error handling
          let errorMessage = 'Nu pot detecta locația GPS';
          if (error.code === 1) {
            errorMessage = 'Permisiunea pentru locație a fost refuzată. Vă rugăm să activați GPS-ul și să permiteți accesul la locație.';
          } else if (error.code === 2) {
            errorMessage = 'Locația nu este disponibilă. Verificați conexiunea la internet și GPS-ul.';
          } else if (error.code === 3) {
            errorMessage = 'Timeout la detectarea locației. Încercați din nou.';
          }
          
          alert(errorMessage + '\n\nVor fi folosite sugestii generale pentru UK.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout
          maximumAge: 300000 // 5 minutes cache
        }
      );
    };

    // Start location detection when app loads
    detectUserLocation();
  }, []);

  // Simple phone number helper for mobile users
  const detectPhoneNumber = async () => {
    if (jobData.phoneNumbers) return; // Skip if already filled
    
    setIsDetectingPhone(true);
    console.log('📱 Manual phone number detection requested...');
    
    try {
      // Show a simple prompt for phone number entry
      const phoneNumber = prompt(
        'Introduceți numărul dumneavoastră de telefon:\n\n' +
        'Exemplu: 07123456789 sau +44 7123 456789'
      );
      
      if (phoneNumber && phoneNumber.trim()) {
        let formattedPhone = phoneNumber.trim();
        
        // Auto-format UK mobile numbers
        if (/^07\d{9}$/.test(formattedPhone)) {
          formattedPhone = `+44 7${formattedPhone.slice(2, 5)} ${formattedPhone.slice(5, 8)} ${formattedPhone.slice(8)}`;
        } else if (/^01\d{9}$/.test(formattedPhone) || /^02\d{8}$/.test(formattedPhone)) {
          // Format landline numbers
          formattedPhone = `+44 ${formattedPhone.slice(1)}`;
        }
        
        setJobData(prev => ({ ...prev, phoneNumbers: formattedPhone }));
        console.log('✅ Phone number manually entered and formatted:', formattedPhone);
      }
    } catch (error) {
      console.error('❌ Phone entry error:', error);
    } finally {
      setIsDetectingPhone(false);
    }
  };

  // Handle pin location changes when in pin mode - WITH 10 SECOND AUTO-EXTRACT DELAY
  const handlePinLocationChange = (coords: { lat: number; lng: number }) => {
    if (!isPinMode) return; // Only update when in pin mode
    
    // Clear any existing timer
    if (autoExtractTimer) {
      clearTimeout(autoExtractTimer);
    }
    
    // Store coordinates immediately (for red pin display)
    setPendingCoords(coords);
    console.log(`📍 Pin moved to: ${coords.lat}, ${coords.lng} - Auto-extract in 10 seconds...`);
    
    // Set 10-second timer for automatic address extraction
    const newTimer = setTimeout(async () => {
      try {
        console.log('⏰ 10 seconds passed - Auto-extracting address...');
        const response = await fetch(`/api/geocoding/reverse?lat=${coords.lat}&lng=${coords.lng}`);
        const data = await response.json();
        
        if (data.success && data.address) {
          console.log(`📍 Auto-extracted address: ${data.address.address}`);
          setPendingPinLocation({
            lat: coords.lat,
            lng: coords.lng,
            address: data.address.address
          });
        }
      } catch (error) {
        console.error('Auto-extract reverse geocoding error:', error);
      }
    }, 10000); // 10 seconds delay
    
    setAutoExtractTimer(newTimer);
  };

  // Confirm pin location and apply to current step - MANUAL OVERRIDE
  const confirmPinLocation = async () => {
    // Clear auto-extract timer since user manually confirmed
    if (autoExtractTimer) {
      clearTimeout(autoExtractTimer);
      setAutoExtractTimer(null);
    }
    
    let locationToConfirm = pendingPinLocation;
    
    // If no address extracted yet, extract immediately from current coords
    if (!pendingPinLocation && pendingCoords) {
      console.log('🚀 Manual confirmation - extracting address immediately...');
      try {
        const response = await fetch(`/api/geocoding/reverse?lat=${pendingCoords.lat}&lng=${pendingCoords.lng}`);
        const data = await response.json();
        
        if (data.success && data.address) {
          locationToConfirm = {
            lat: pendingCoords.lat,
            lng: pendingCoords.lng,
            address: data.address.address
          };
        }
      } catch (error) {
        console.error('Manual extract reverse geocoding error:', error);
        return;
      }
    }
    
    if (!locationToConfirm) return;
    
    console.log(`✅ Manually confirming pin location: ${locationToConfirm.address}`);
    
    if (currentStep === 'pickup') {
      setPickupCoords({ lat: locationToConfirm.lat, lng: locationToConfirm.lng });
      setJobData(prev => ({ ...prev, pickup: locationToConfirm.address }));
      
      // Exit pin mode and clear pending data
      setIsPinMode(false);
      setPendingPinLocation(null);
      setPendingCoords(null);
      
      // Reopen bottom sheet to restore card position
      setTimeout(() => {
        setIsBottomSheetOpen(true);
      }, 100);
      
      // User will manually navigate to next step
    } else if (currentStep === 'destination') {
      setDestinationCoords({ lat: locationToConfirm.lat, lng: locationToConfirm.lng });
      setJobData(prev => ({ ...prev, destination: locationToConfirm.address }));
      
      // Exit pin mode and clear pending data
      setIsPinMode(false);
      setPendingPinLocation(null);
      setPendingCoords(null);
      
      // Reopen bottom sheet to restore card position
      setTimeout(() => {
        setIsBottomSheetOpen(true);
      }, 100);
      
      // User will manually navigate to next step
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        try {
          // Get exact address from GPS coordinates
          const response = await fetch(`/api/geocoding/reverse?lat=${coords.lat}&lng=${coords.lng}`);
          const data = await response.json();
          
          if (data.success && data.address && data.address.address) {
            const exactAddress = data.address.address;
            console.log('🏠 Exact address from GPS:', exactAddress);
            setUserLocation(coords);
            setPickupCoords(coords);
            setJobData(prev => ({ ...prev, pickup: exactAddress }));
            setIsLoadingLocation(false);
            
            // DON'T auto-advance - let user verify the detected address
            console.log('📍 GPS address detected. User can verify before proceeding.');
            return;
          }
        } catch (error) {
          console.error('❌ Reverse geocoding failed:', error);
        }
        
        // Fallback to Current Location if reverse geocoding fails
        setUserLocation(coords);
        setPickupCoords(coords);
        setJobData(prev => ({ ...prev, pickup: 'Current Location' }));
        setIsLoadingLocation(false);
        console.log('✅ Location set as Current Location');
        
        // DON'T auto-advance - let user verify the location before proceeding
      },
      (error) => {
        console.error('❌ GPS location error:', error);
        setIsLoadingLocation(false);
        alert('Nu pot accesa locația ta. Te rog să accepți permisiunile de locație sau să folosești pin-ul de pe hartă.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  // Auto-calculate route when both addresses are set
  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      calculateRoute();
    }
  }, [pickupCoords, destinationCoords]);

  // Cleanup auto-extract timer when pin mode is disabled
  useEffect(() => {
    if (!isPinMode && autoExtractTimer) {
      console.log('🧹 Cleaning up auto-extract timer (pin mode disabled)');
      clearTimeout(autoExtractTimer);
      setAutoExtractTimer(null);
      setPendingCoords(null);
      setPendingPinLocation(null);
    }
  }, [isPinMode, autoExtractTimer]);

  // Removed auto-trigger to prevent unwanted permission requests

  const calculateRoute = async () => {
    if (!pickupCoords || !destinationCoords) return;
    
    try {
      console.log('📡 Calculating route...');
      const response = await fetch('/api/route-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupCoords,
          destination: destinationCoords,
          viaPoints: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Route calculation successful:', data);
        setRouteDetails({
          distance: data.distance,
          duration: data.duration,
          price: Math.round(data.estimatedPrice * 100) / 100
        });
        setJobData(prev => ({ ...prev, price: data.estimatedPrice.toString() }));
      }
    } catch (error) {
      console.error('❌ Route calculation failed:', error);
    }
  };

  const bottomSheetVariants = {
    open: { y: 0 },
    closed: { y: '50%' }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  // Vehicle types with simple descriptions
  const vehicleTypes = [
    {
      name: 'Saloon',
      description: 'Modern sedan for up to 4 passengers',
      capacity: '1-4 passengers',
      features: ['Air conditioning', 'Standard luggage space', 'Comfortable seating', 'GPS tracking']
    },
    {
      name: 'Estate',
      description: 'Family vehicle with large boot',
      capacity: '1-5 passengers',
      features: ['Large boot space', 'Family friendly', 'Extra luggage capacity', 'Child seats available']
    },
    {
      name: 'MPV',
      description: 'Multi-purpose vehicle for groups',
      capacity: '4-7 passengers',
      features: ['Group travel', 'Wheelchair accessible', 'More space', 'USB charging ports']
    },
    {
      name: 'Executive',
      description: 'Premium luxury vehicle',
      capacity: '1-4 passengers',
      features: ['Leather seats', 'Premium comfort', 'Business class', 'Phone chargers']
    },
    {
      name: 'Large MPV',
      description: 'Executive vehicle for large groups',
      capacity: '4-8 passengers',
      features: ['Executive comfort', 'Maximum capacity', 'Premium service', 'Entertainment system']
    },
    {
      name: 'Disable Access',
      description: 'Wheelchair accessible vehicle',
      capacity: '1-4 passengers + wheelchair',
      features: ['Wheelchair ramp', 'Disabled access', 'Special equipment', 'Trained driver']
    }
  ];

  return (
    <div className="h-screen w-screen relative overflow-hidden m-0 p-0 flex flex-col">
      {/* Half Screen Map - Top Section */}
      <div className="flex-1 relative" style={{
        height: isBottomSheetOpen 
          ? (currentStep === 'details' ? '30vh' : currentStep === 'vehicle' ? '32vh' : '45vh')  // Smaller map for vehicle selection
          : '70vh' // Larger when panel is minimized
      }}>
        <SimpleBookingMap
          pickup={pickupCoords ? { address: jobData.pickup, coordinates: pickupCoords } : null}
          destination={destinationCoords ? { address: jobData.destination, coordinates: destinationCoords } : null}
          currentPrice={routeDetails?.price || null}
          onCenterChanged={isPinMode ? handlePinLocationChange : undefined}
          className="w-full h-full"
          bottomPanelHeight={0} // No bottom panel adjustment needed now
          isPinMode={isPinMode}
        />
      </div>

      {/* Bottom Panel - Flexible Height */}
      <motion.div
        variants={bottomSheetVariants}
        animate={isBottomSheetOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-30 flex-shrink-0 bg-black"
        style={{ 
          height: isBottomSheetOpen 
            ? (currentStep === 'details' ? '70vh' : currentStep === 'vehicle' ? '68vh' : '55vh')  // Extra height for vehicle selection
            : '30vh', // Minimized height
          background: 'rgb(0, 0, 0)'
        }}
      >
        {/* Handle */}
        <div 
          className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3 cursor-pointer hover:bg-white/50 transition-colors"
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
        />

        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Pickup Location */}
            {currentStep === 'pickup' && (
              <motion.div
                key="pickup"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-white">Where are you?</h2>
                
                <AddressAutocomplete
                  placeholder="Enter pickup location"
                  value={jobData.pickup}
                  userLocation={userLocation}
                  onSelect={(result) => {
                    console.log('🟢 PICKUP selected from autocomplete:', result);
                    setJobData(prev => ({ ...prev, pickup: result.address }));
                    if (result.coordinates) {
                      setPickupCoords(result.coordinates);
                    }
                    
                    // Auto-advance to destination
                    setTimeout(() => {
                      setCurrentStep('destination');
                    }, 500);
                  }}
                />

                <Button
                  onClick={getUserLocation}
                  disabled={isLoadingLocation}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  {isLoadingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Getting location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      <span>Use My Location</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    console.log('📍 PICKUP PIN MODE ACTIVATED');
                    setIsPinMode(true);
                    setIsBottomSheetOpen(false);
                    // Clear any existing timer and pending location
                    if (autoExtractTimer) {
                      clearTimeout(autoExtractTimer);
                      setAutoExtractTimer(null);
                    }
                    setPendingCoords(null);
                    setPendingPinLocation(null);
                  }}
                  className="w-full h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-2xl text-lg font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <MapPin className="w-5 h-5" />
                  <span>Pin on Map</span>
                </Button>


              </motion.div>
            )}

            {/* Step 2: Destination */}
            {currentStep === 'destination' && (
              <motion.div
                key="destination"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setCurrentStep('pickup')}
                    className="p-2 bg-black/80 hover:bg-black/60 rounded-full border border-gray-600"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </Button>
                  <h2 className="text-xl font-bold text-white">Where to?</h2>
                </div>
                
                <AddressAutocomplete
                  placeholder="Enter destination"
                  value={jobData.destination}
                  userLocation={userLocation}
                  onSelect={(result) => {
                    console.log('🔴 DESTINATION selected from autocomplete:', result);
                    setJobData(prev => ({ ...prev, destination: result.address }));
                    if (result.coordinates) {
                      setDestinationCoords(result.coordinates);
                    }
                    
                    // Auto-advance to vehicle selection
                    setTimeout(() => {
                      setCurrentStep('vehicle');
                    }, 500);
                  }}
                />

                <Button
                  onClick={() => {
                    console.log('📍 DESTINATION PIN MODE ACTIVATED');
                    setIsPinMode(true);
                    setIsBottomSheetOpen(false);
                    // Clear any existing timer and pending location
                    if (autoExtractTimer) {
                      clearTimeout(autoExtractTimer);
                      setAutoExtractTimer(null);
                    }
                    setPendingCoords(null);
                    setPendingPinLocation(null);
                  }}
                  className="w-full h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-2xl text-lg font-semibold shadow-lg flex items-center justify-center space-x-2"
                >
                  <MapPin className="w-5 h-5" />
                  <span>Pin Destination on Map</span>
                </Button>
              </motion.div>
            )}

            {/* Step 3: Vehicle Selection - Customer Details Style */}
            {currentStep === 'vehicle' && (
              <motion.div
                key="vehicle"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6 px-4 py-4 flex flex-col h-full overflow-hidden"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <Button
                    onClick={() => setCurrentStep('destination')}
                    className="p-2 bg-black/80 hover:bg-black/60 rounded-full border border-gray-600"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </Button>
                  <h2 className="text-xl font-bold text-white">Choose Vehicle</h2>
                </div>
                
                {/* Filter tabs - functional categories */}
                <div className="flex space-x-2 mb-6">
                  <div 
                    onClick={() => setSelectedCategory('recommended')}
                    className={`px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer transition-all ${
                      selectedCategory === 'recommended' 
                        ? 'bg-transparent text-green-400 border border-green-400' 
                        : 'bg-transparent text-white border border-white/20 hover:border-white/40'
                    }`}
                  >
                    Recommended
                  </div>
                  <div 
                    onClick={() => setSelectedCategory('family')}
                    className={`px-4 py-2 rounded-2xl text-sm font-medium flex items-center space-x-1 cursor-pointer transition-all ${
                      selectedCategory === 'family' 
                        ? 'bg-transparent text-green-400 border border-green-400' 
                        : 'bg-transparent text-white border border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white/30 rounded-full text-white text-xs flex items-center justify-center">👨‍👩‍👧‍👦</div>
                    <span>Family</span>
                  </div>
                  <div 
                    onClick={() => setSelectedCategory('special')}
                    className={`px-4 py-2 rounded-2xl text-sm font-medium flex items-center space-x-1 cursor-pointer transition-all ${
                      selectedCategory === 'special' 
                        ? 'bg-transparent text-green-400 border border-green-400' 
                        : 'bg-transparent text-white border border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white/30 rounded-full text-white text-xs flex items-center justify-center">⭐</div>
                    <span>Special</span>
                  </div>
                </div>
                
                {/* Vehicle List - filtered by category with extra scroll space */}
                <div className="space-y-3 flex-1 overflow-y-auto pb-12 max-h-[65vh] min-h-[400px]">
                  {/* Recommended Category - Standard vehicles */}
                  {selectedCategory === 'recommended' && (
                    <>
                      {/* Saloon */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Saloon' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-green-600 rounded"></div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-lg text-white">Saloon</h3>
                            <div className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">FASTEST</div>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>1 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>4 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Standard vehicles</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£8.5</div>
                        <div className="text-sm text-gray-400 line-through">£12.0</div>
                      </div>
                    </div>
                      </div>

                      {/* Estate */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Estate' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-gray-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Estate</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>2 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>5 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Family vehicle with large boot</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£9.8</div>
                        <div className="text-sm text-gray-400 line-through">£14.0</div>
                      </div>
                    </div>
                      </div>
                    </>
                  )}

                  {/* Family Category - MPV vehicles */}
                  {selectedCategory === 'family' && (
                    <>
                      {/* MPV */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'MPV' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-yellow-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">MPV</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>3 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>6 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Multi-purpose vehicle</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£12.5</div>
                        <div className="text-sm text-gray-400 line-through">£18.0</div>
                      </div>
                    </div>
                      </div>

                      {/* Large MPV */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Large MPV' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-blue-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Large MPV</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>4 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>7 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Large group vehicle</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£15.0</div>
                        <div className="text-sm text-gray-400 line-through">£22.0</div>
                      </div>
                    </div>
                      </div>

                      {/* Large Group */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Large Group' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                              <div className="w-8 h-5 bg-red-600 rounded"></div>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-white">Large Group</h3>
                              <div className="flex items-center space-x-2 text-gray-300 text-sm">
                                <span>6 min</span>
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>8 seater</span>
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm">Maximum capacity vehicle</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">£22.0</div>
                            <div className="text-sm text-gray-400 line-through">£30.0</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Special Category - Wheelchair, Executive, Pet Friendly */}
                  {selectedCategory === 'special' && (
                    <>
                      {/* Executive */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Executive' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-purple-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Executive</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>5 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>4 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Premium luxury vehicle</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£20.0</div>
                        <div className="text-sm text-gray-400 line-through">£28.0</div>
                      </div>
                    </div>
                      </div>

                      {/* Wheelchair Accessible */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Wheelchair Accessible' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-blue-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Wheelchair</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>6 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>6 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Wheelchair accessible</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£18.0</div>
                        <div className="text-sm text-gray-400 line-through">£25.0</div>
                      </div>
                    </div>
                      </div>

                      {/* Pet Friendly */}
                      <div
                        onClick={() => {
                          setJobData(prev => ({ ...prev, vehicleType: 'Pet Friendly' }));
                          setCurrentStep('details');
                        }}
                        className="p-4 rounded-xl bg-transparent border border-gray-600 cursor-pointer transition-all hover:border-gray-500"
                      >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center">
                          <div className="w-8 h-5 bg-orange-600 rounded"></div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Pet Friendly</h3>
                          <div className="flex items-center space-x-2 text-gray-300 text-sm">
                            <span>4 min</span>
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>5 seater</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">Pet transport friendly</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">£12.0</div>
                        <div className="text-sm text-gray-400 line-through">£16.0</div>
                      </div>
                    </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Customer Details */}
            {currentStep === 'details' && (
              <motion.div
                key="details"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4 max-h-[50vh] overflow-y-auto pb-4"
              >
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setCurrentStep('vehicle')}
                    className="p-2 bg-black/80 hover:bg-black/60 rounded-full border border-gray-600"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </Button>
                  <h2 className="text-xl font-bold text-white">Customer Details</h2>
                </div>
                
                {/* Route Summary */}
                {routeDetails && (
                  <div className="bg-transparent p-3 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/80">Distance: {routeDetails.distance}</span>
                      <span className="text-sm text-white/80">Duration: {routeDetails.duration}</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-400 mt-1">
                      Price: £{routeDetails.price.toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Passengers
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={jobData.passengerCount}
                      onChange={(e) => setJobData(prev => ({ ...prev, passengerCount: e.target.value }))}
                      className="h-12 bg-black border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Luggage
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={jobData.luggageCount}
                      onChange={(e) => setJobData(prev => ({ ...prev, luggageCount: e.target.value }))}
                      className="h-12 bg-black border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Customer Name
                  </label>
                  <Input
                    placeholder="Enter customer name"
                    value={jobData.customerName}
                    onChange={(e) => setJobData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="h-12 bg-black border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Phone Number
                  </label>
                  <Input
                    placeholder="Enter phone number"
                    value={jobData.phoneNumbers}
                    onChange={(e) => setJobData(prev => ({ ...prev, phoneNumbers: e.target.value }))}
                    className="h-12 bg-black border-gray-600 text-white placeholder-gray-400"
                  />
                </div>



                <Button
                  onClick={() => setCurrentStep('confirm')}
                  className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl text-lg font-semibold shadow-lg mt-4"
                >
                  Review Booking
                </Button>
              </motion.div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 'confirm' && (
              <motion.div
                key="confirm"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setCurrentStep('details')}
                    className="p-2 bg-black/80 hover:bg-black/60 rounded-full border border-gray-600"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </Button>
                  <h2 className="text-xl font-bold text-white">Confirm Booking</h2>
                </div>
                
                <div className="bg-transparent p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">From:</span>
                    <span className="text-right flex-1 ml-2 text-gray-300">{jobData.pickup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">To:</span>
                    <span className="text-right flex-1 ml-2 text-gray-300">{jobData.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Passengers:</span>
                    <span className="text-gray-300">{jobData.passengerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Vehicle:</span>
                    <span className="text-gray-300">{jobData.vehicleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Customer:</span>
                    <span className="text-gray-300">{jobData.customerName || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-white">Phone:</span>
                    <span className="text-gray-300 text-right flex-1 ml-2 break-all">{jobData.phoneNumbers || 'Not specified'}</span>
                  </div>
                  {routeDetails && (
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Price:</span>
                      <span className="text-yellow-400">£{routeDetails.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={async () => {
                    try {
                      console.log('📝 Creating booking...');
                      const newJob = await createJob.mutateAsync({
                        jobNumber: `AUTO-${Date.now()}`,
                        pickup: jobData.pickup,
                        destination: jobData.destination,
                        date: new Date().toISOString().split('T')[0],
                        time: 'ASAP',
                        customerName: jobData.customerName || 'Walk-in Customer',
                        phoneNumbers: jobData.phoneNumbers || 'No phone',
                        passengerCount: parseInt(jobData.passengerCount),
                        luggageCount: parseInt(jobData.luggageCount),
                        vehicleType: jobData.vehicleType,
                        price: routeDetails?.price || 0,
                        driverNotes: '',
                        status: 'pending'
                      });
                      
                      console.log('✅ Booking created successfully');
                      alert('Booking created successfully!');
                      
                      // Reset form
                      setJobData({
                        pickup: '',
                        destination: '',
                        viaPoints: [],
                        dateTime: 'ASAP',
                        customerName: '',
                        phoneNumbers: '',
                        passengerCount: '1',
                        luggageCount: '0',
                        vehicleType: 'Saloon',
                        price: '',
                        driverNotes: ''
                      });
                      setPickupCoords(null);
                      setDestinationCoords(null);
                      setRouteDetails(null);
                      setCurrentStep('pickup');
                    } catch (error) {
                      console.error('❌ Booking creation failed:', error);
                      alert('Failed to create booking. Please try again.');
                    }
                  }}
                  className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl text-lg font-semibold shadow-lg"
                >
                  <Car className="w-5 h-5 mr-2" />
                  Book Now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Pin Mode Instruction with Manual Control */}
      {isPinMode && (
        <div className="absolute top-4 left-4 right-4 z-40 bg-black/90 text-white p-4 rounded-lg shadow-lg">
          <div className="text-center space-y-3">
            <h3 className="font-bold text-lg">📍 Choose Location</h3>
            <p className="text-sm">
              {currentStep === 'pickup' ? 'Move the map to position the red pin on your pickup location' : 
               'Move the map to position the red pin on your destination'}
            </p>
            
            {/* Show pending location address if available */}
            {pendingPinLocation && (
              <div className="bg-white/10 rounded p-2">
                <p className="text-xs opacity-75">Selected:</p>
                <p className="text-sm font-medium">{pendingPinLocation.address}</p>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => {
                  setIsPinMode(false);
                  setIsBottomSheetOpen(true);
                  setPendingPinLocation(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                size="sm"
              >
                Cancel
              </Button>
              
              <Button 
                onClick={confirmPinLocation}
                disabled={!pendingPinLocation && !pendingCoords}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}