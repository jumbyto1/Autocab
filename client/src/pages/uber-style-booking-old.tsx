import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Clock, Car, User, Phone, CreditCard } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState<'pickup' | 'destination' | 'details' | 'confirm'>('pickup');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
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

  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: string; duration: string; price: number } | null>(null);

  // Handle pin location changes
  const handlePinLocationChange = async (coords: { lat: number; lng: number }) => {
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await response.json();
      
      if (data.success && data.address) {
        console.log(`✅ Pin location updated: ${data.address.address}`);
        
        if (currentStep === 'pickup') {
          setPickupCoords(coords);
          setJobData(prev => ({ ...prev, pickup: data.address.address }));
        } else if (currentStep === 'destination') {
          setDestinationCoords(coords);
          setJobData(prev => ({ ...prev, destination: data.address.address }));
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
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
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setPickupCoords(coords);
        setJobData(prev => ({ ...prev, pickup: `Current Location` }));
        setIsLoadingLocation(false);
        console.log('📍 User location detected:', coords);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoadingLocation(false);
        // Fallback to Canterbury center
        const fallbackCoords = { lat: 51.279, lng: 1.083 };
        setUserLocation(fallbackCoords);
        setPickupCoords(fallbackCoords);
        setJobData(prev => ({ ...prev, pickup: `Canterbury Center` }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const { createJob } = useJobs();
  const { sendToAutocab, checkDuplicate } = useAutocab();

  // Cleanup - removed auto-location detection
          setUserLocation(coords);
          
          // Convert coordinates to address for pickup
          try {
            const response = await fetch(`/api/geocoding/reverse?lat=${coords.lat}&lng=${coords.lng}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.address) {
                console.log('🏠 Reverse geocoded address:', data.address);
                setPickupCoords(coords);
                setJobData(prev => ({ ...prev, pickup: data.address }));
                console.log('✅ Pickup automatically set from geolocation');
              }
            }
          } catch (error) {
            console.error('❌ Reverse geocoding failed:', error);
            // Fallback to coordinates as pickup
            setPickupCoords(coords);
            setJobData(prev => ({ ...prev, pickup: "Current Location" }));
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Canterbury center
          const defaultCoords = { lat: 51.2802, lng: 1.0789 };
          setUserLocation(defaultCoords);
          setPickupCoords(defaultCoords);
          setJobData(prev => ({ ...prev, pickup: "Canterbury Center" }));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }, [currentStep]);

  const vehicleTypes = [
    { id: 'saloon', name: 'Saloon', icon: '🚗', description: 'Standard car for up to 4 passengers' },
    { id: 'estate', name: 'Estate', icon: '🚙', description: 'Larger car with extra space' },
    { id: 'mpv', name: 'MPV', icon: '🚐', description: 'Multi-purpose vehicle for up to 6 passengers' },
    { id: 'large-mpv', name: 'Large MPV', icon: '🚌', description: 'Large vehicle for up to 8 passengers' }
  ];

  // Auto-calculate route when both addresses are set
  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      calculateRoute();
    }
  }, [pickupCoords, destinationCoords]);

  const calculateRoute = async () => {
    console.log('🛣️ calculateRoute called with:', {
      pickupCoords,
      destinationCoords,
      pickup: jobData.pickup,
      destination: jobData.destination,
      hasPickupCoords: !!pickupCoords,
      hasDestinationCoords: !!destinationCoords
    });
    
    if (!pickupCoords || !destinationCoords) {
      console.log('❌ calculateRoute aborted - missing coordinates');
      return;
    }
    
    try {
      console.log('📡 Sending route calculation request with coordinates...');
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
      } else {
        console.error('❌ Route calculation failed - server error:', response.status);
      }
    } catch (error) {
      console.error('❌ Route calculation failed - network error:', error);
    }
  };

  const handleAddressSelect = async (address: string, type: 'pickup' | 'destination') => {
    console.log(`📍 handleAddressSelect called:`, { address, type });
    try {
      const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📍 Geocoding result for ${type}:`, data);
        
        const coords = { lat: data.lat, lng: data.lng };
        if (type === 'pickup') {
          setPickupCoords(coords);
          setJobData(prev => ({ ...prev, pickup: address }));
          console.log('📍 Pickup coordinates set:', coords);
        } else {
          setDestinationCoords(coords);
          setJobData(prev => ({ ...prev, destination: address }));
          console.log('📍 Destination coordinates set:', coords);
          console.log('🔄 After destination set - will trigger journey visualization');
        }
      }
    } catch (error) {
      console.error('❌ Geocoding failed:', error);
    }
  };

  const handleBookingSubmit = async () => {
    try {
      // Create job first
      const newJob = await createJob.mutateAsync({
        pickup: jobData.pickup,
        destination: jobData.destination,
        viaPoints: jobData.viaPoints,
        dateTime: jobData.dateTime,
        customerName: jobData.customerName,
        phoneNumbers: jobData.phoneNumbers,
        passengerCount: parseInt(jobData.passengerCount),
        luggageCount: parseInt(jobData.luggageCount),
        vehicleType: jobData.vehicleType,
        price: parseFloat(jobData.price),
        driverNotes: jobData.driverNotes
      });

      // Send to Autocab
      await sendToAutocab(newJob.id);
      
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
      setCurrentStep('pickup');
      setPickupCoords(null);
      setDestinationCoords(null);
      setRouteDetails(null);
      
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const bottomSheetVariants = {
    closed: { y: '90%' },
    open: { y: '0%' }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  // NO AUTO-DETECT - User chooses manual pin or GPS button
  // Removed auto-detection to prevent dual pin problem

  // Auto-calculate route when both pickup and destination are available
  useEffect(() => {
    if (pickupCoords && destinationCoords && jobData.pickup && jobData.destination) {
      console.log('🛣️ AUTO-CALCULATING ROUTE - Both coordinates available');
      console.log('📍 Pickup:', jobData.pickup, pickupCoords);
      console.log('📍 Destination:', jobData.destination, destinationCoords);
      calculateRoute();
    }
  }, [pickupCoords, destinationCoords, jobData.pickup, jobData.destination]);

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-100">
      {/* Full Screen Map */}
      <div className="absolute inset-0">
        <SimpleBookingMap
          pickup={pickupCoords ? { address: jobData.pickup, coordinates: pickupCoords } : null}
          destination={destinationCoords ? { address: jobData.destination, coordinates: destinationCoords } : null}
          currentPrice={routeDetails?.price || null}
          onCenterChanged={isPinMode ? handlePinLocationChange : undefined}
          className="w-full h-full"
        />
            
            console.log('✅ Pickup location confirmed automatically:', coords);
          }}
        />
        
        {/* Static Red Pin in Center - Much easier to use than draggable green pin */}
        {isMovingPin && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="text-5xl" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }}>
                📍
              </div>
            </div>
          </div>
        )}

        {/* Instruction Text - Positioned at bottom for better visibility */}
        {isMovingPin && (
          <div className="absolute bottom-32 left-4 right-4 flex justify-center pointer-events-none">
            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
              Move map to adjust pin location
            </div>
          </div>
        )}


      </div>

      {/* Top Header - Mobile Optimized */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2 pt-6 bg-gradient-to-b from-black/30 to-transparent">
        <div className="flex items-center justify-between text-white">
          <h1 className="text-xl font-bold">CABCO</h1>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">16:44</span>
          </div>
        </div>
      </div>

      {/* Current Location Button - Mobile Optimized */}
      <Button 
        className="absolute top-16 right-4 z-20 w-10 h-10 rounded-full bg-white shadow-lg"
        variant="outline"
        size="icon"
      >
        <Navigation className="w-4 h-4 text-gray-700" />
      </Button>

      {/* Route Info Card (when route calculated) */}
      <AnimatePresence>
        {routeDetails && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-24 left-4 right-4 z-20"
          >
            <Card className="p-4 bg-white/95 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Car className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-lg">{routeDetails.distance}</p>
                    <p className="text-sm text-gray-600">{routeDetails.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">£{routeDetails.price}</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">FASTEST</Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Buttons - Only during location step */}
      {currentStep === 'location' && (
        <div className="absolute bottom-16 left-4 right-4 z-30 space-y-3">
          {/* Use My Location Button - GPS Detection - Only for pickup */}
          {currentStep === 'location' && (
            <Button 
              onClick={() => {
                console.log('🌍 USE MY LOCATION clicked - starting GPS detection...');
                setIsLoadingLocation(true);
                
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const coords = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    };
                    console.log('📍 GPS coordinates obtained:', coords);
                    setUserLocation(coords);
                    setPickupCoords(coords);
                    setSavedGPSCoords(coords);
                  
                  // Convert coordinates to exact address
                  try {
                    const response = await fetch(`/api/geocoding/reverse?lat=${coords.lat}&lng=${coords.lng}`);
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.address && data.address.address) {
                        const exactAddress = data.address.address;
                        console.log('🏠 Exact address from GPS:', exactAddress);
                        setJobData(prev => ({ ...prev, pickup: exactAddress }));
                        setIsLoadingLocation(false);
                        
                        // Automatically go to destination step
                        setTimeout(() => {
                          setCurrentStep('destination');
                          setIsBottomSheetOpen(true);
                        }, 1000);
                        return;
                      }
                    }
                  } catch (error) {
                    console.error('❌ Reverse geocoding failed:', error);
                  }
                  
                  // Fallback to Current Location if reverse geocoding fails
                  setJobData(prev => ({ ...prev, pickup: 'Current Location' }));
                  setIsLoadingLocation(false);
                  console.log('✅ Location set as Current Location');
                  
                  // Automatically go to destination step
                  setTimeout(() => {
                    setCurrentStep('destination');
                    setIsBottomSheetOpen(true);
                  }, 1000);
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
            }}
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
          )}
          
          {/* Auto-select location on map - no manual button needed */}
        </div>
      )}

      {/* Bottom Sheet - Hidden during location step - Glassmorphism Effect */}
      {currentStep !== 'location' && (
        <motion.div
          variants={bottomSheetVariants}
          animate={isBottomSheetOpen ? 'open' : 'closed'}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl shadow-2xl bg-white/85 backdrop-blur-lg border-t border-white/30"
          style={{ 
            minHeight: '60vh',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'rgba(255, 255, 255, 0.85)'
          }}
        >
        {/* Handle */}
        <div 
          className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 cursor-pointer hover:bg-gray-400 transition-colors"
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
        />

        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Vehicle Selection */}
            {currentStep === 'vehicle' && (
              <motion.div
                key="vehicle"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-gray-900">Choose your ride</h2>
                
                <div className="space-y-2">
                  {vehicleTypes.map((vehicle) => (
                    <motion.div
                      key={vehicle.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedVehicle(vehicle.id);
                        setJobData(prev => ({ ...prev, vehicleType: vehicle.name }));
                        // Trecem automat la următorul pas și activăm modul de mutare pin
                        setTimeout(() => {
                          setCurrentStep('location');
                          setMoveMode(true); // Activăm automat modul de mutare pin
                          setIsMovingPin(true); // Activăm pin-ul draggable
                          
                          // Setăm coordonatele inițiale pentru pin dacă nu sunt deja setate
                          if (!pickupCoords) {
                            const defaultCoords = { lat: 51.279, lng: 1.083 }; // Canterbury center
                            setPickupCoords(defaultCoords);
                            setCurrentPinCoords(defaultCoords);
                            setJobData(prev => ({ ...prev, pickup: "Canterbury Center" }));
                          }
                        }, 500);
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedVehicle === vehicle.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{vehicle.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{vehicle.name}</h3>
                          <p className="text-sm text-gray-600">{vehicle.description}</p>
                        </div>
                        {selectedVehicle === vehicle.id && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>


              </motion.div>
            )}

            {/* Step 2: Location Detection & Pin Move - Hidden UI */}
            {currentStep === 'location' && (
              <motion.div
                key="location"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* Completely hidden - only transparent background for pin interaction */}
                <div className="h-1"></div>
              </motion.div>
            )}

            {/* Step 3: Pickup Address */}
            {currentStep === 'pickup' && (
              <motion.div
                key="pickup"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Where from?</h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setCurrentStep('location');
                      setMoveMode(true);
                      setIsMovingPin(true);
                      setIsBottomSheetOpen(false);
                    }}
                    className="text-gray-600 flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                </div>
                
                {/* Debug info */}
                {jobData.pickup && (
                  <div className="p-2 bg-blue-100 rounded text-xs">
                    DEBUG: Current pickup value: "{jobData.pickup}"
                  </div>
                )}
                
                <AddressAutocomplete
                  value={jobData.pickup}
                  onSelect={(address) => {
                    console.log('📍 Address selected from autocomplete:', address);
                    setJobData(prev => ({ ...prev, pickup: address }));
                    handleAddressSelect(address, 'pickup');
                  }}
                  placeholder="Enter pickup location"
                  className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-green-500 pl-12"
                  icon={<MapPin className="w-5 h-5 text-green-600" />}
                />

                {/* Auto-transition to destination when pickup coordinates are available */}
                {jobData.pickup && pickupCoords && (
                  <Button 
                    onClick={() => {
                      handleAddressSelect(jobData.pickup, 'pickup');
                      setCurrentStep('destination');
                    }}
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-lg font-semibold"
                  >
                    Continue to Destination
                  </Button>
                )}
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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Where to?</h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep('pickup')}
                    className="text-gray-600"
                  >
                    Back
                  </Button>
                </div>

                {/* Pickup Address - Editable */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full" />
                    <span>Pickup Location</span>
                  </label>
                  <Input
                    value={jobData.pickup}
                    onChange={(e) => setJobData(prev => ({ ...prev, pickup: e.target.value }))}
                    placeholder="Enter pickup address"
                    className="h-12 text-base rounded-xl border-2 border-gray-200 focus:border-green-500"
                  />
                </div>

                {/* Destination Address - Main Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full" />
                    <span>Destination</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-600" />
                    <AddressAutocomplete
                      value={jobData.destination}
                      onSelect={(address, details) => {
                        console.log('📍 Destination selected from autocomplete:', address, details);
                        setJobData(prev => ({ ...prev, destination: address }));
                        // Immediately call geocoding for the selected address
                        handleAddressSelect(address, 'destination');
                        // Enable journey visualization after destination selection
                        setIsMovingPin(false);
                        setMoveMode(false);
                        console.log('🗺️ Journey visualization enabled after destination selection');
                        
                        // Scroll up slightly to center journey above panel
                        setTimeout(() => {
                          window.scrollBy({
                            top: -80, // Scroll up 80px to better center journey
                            behavior: 'smooth'
                          });
                        }, 800);
                      }}
                      placeholder="Enter destination"
                      className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-green-500 pl-12"
                    />
                  </div>
                </div>



                {jobData.destination && destinationCoords && (
                  <Button 
                    onClick={() => {
                      console.log('🎯 Continue with journey:', jobData.destination);
                      // Preserve route data when moving to details step
                      setCurrentStep('details');
                    }}
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-lg font-semibold"
                  >
                    Continue with Journey
                  </Button>
                )}
                
                {/* Debug info for destination */}
                {jobData.destination && (
                  <div className="p-2 bg-blue-100 rounded text-xs">
                    DEBUG: Destination "{jobData.destination}" - Has coords: {destinationCoords ? 'YES' : 'NO'}
                    {destinationCoords && ` (${destinationCoords.lat}, ${destinationCoords.lng})`}
                  </div>
                )}
              </motion.div>
            )}



            {/* Step 3: Booking Details */}
            {currentStep === 'details' && (
              <motion.div
                key="details"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep('destination')}
                    className="text-gray-600"
                  >
                    Back
                  </Button>
                </div>

                {/* Route Summary */}
                <Card className="p-4 bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-600 rounded-full" />
                      <span className="text-sm text-gray-600">{jobData.pickup}</span>
                    </div>
                    <div className="border-l-2 border-gray-300 ml-1.5 h-4" />
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-600 rounded-full" />
                      <span className="text-sm text-gray-600">{jobData.destination}</span>
                    </div>
                  </div>
                </Card>

                {/* Customer Details */}
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Customer name"
                      value={jobData.customerName}
                      onChange={(e) => setJobData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="pl-12 h-12 rounded-xl"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Phone number"
                      value={jobData.phoneNumbers}
                      onChange={(e) => setJobData(prev => ({ ...prev, phoneNumbers: e.target.value }))}
                      className="pl-12 h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Passengers"
                      value={jobData.passengerCount}
                      onChange={(e) => setJobData(prev => ({ ...prev, passengerCount: e.target.value }))}
                      className="h-12 rounded-xl text-center"
                    />
                    <Input
                      placeholder="Luggage"
                      value={jobData.luggageCount}
                      onChange={(e) => setJobData(prev => ({ ...prev, luggageCount: e.target.value }))}
                      className="h-12 rounded-xl text-center"
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => setCurrentStep('confirm')}
                  disabled={!jobData.customerName || !jobData.phoneNumbers}
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-lg font-semibold disabled:bg-gray-300"
                >
                  Continue to Confirmation
                </Button>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 'confirm' && (
              <motion.div
                key="confirm"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Confirm Booking</h2>
                  <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep('details')}
                    className="text-gray-600"
                  >
                    Back
                  </Button>
                </div>

                {/* Final Summary */}
                <Card className="p-6 space-y-4 glass-panel">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total Fare</span>
                    <span className="text-3xl font-bold text-green-600">£{jobData.price}</span>
                  </div>
                  
                  <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span>{jobData.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{jobData.phoneNumbers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passengers:</span>
                      <span>{jobData.passengerCount}</span>
                    </div>
                    {routeDetails && (
                      <>
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span>{routeDetails.distance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{routeDetails.duration}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                <Button 
                  onClick={handleBookingSubmit}
                  className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xl font-bold"
                >
                  Book Now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      )}
    </div>
  );
}