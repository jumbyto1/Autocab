import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { MobileMenuButton } from "@/components/layout/sidebar";
import { TripDetails } from "@/components/bot-advanced/trip-details";
import { CustomerDetails } from "@/components/bot-advanced/customer-details";
import { BookingDetails } from "@/components/bot-advanced/booking-details";
import { RouteMap } from "@/components/bot-advanced/route-map";
import { DriverMap } from "@/components/bot-advanced/driver-map";
import { VehicleTracker } from "@/components/vehicle-tracker";
import { GoogleMapsPanel } from "@/components/autocab-new/google-maps-panel";
import { AutocabLiveBookings } from "@/components/autocab-live-bookings";
import { TripInformation } from "@/components/bot-advanced/trip-information";
import { PriceEditModal } from "@/components/bot-advanced/price-edit-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Wand2, Send, Mail, Save, X, Calendar, Clock, Plus, RefreshCw, FileText, Search, Download } from "lucide-react";
import { useJobs } from "@/hooks/use-jobs";
import { useAutocab } from "@/hooks/use-autocab";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { JobData, ExtractedJobData } from "@/lib/types";
import type { Job, InsertJob } from "@shared/schema";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function BotAdvanced() {
  const { jobId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getJob, createJob, updateJob } = useJobs();
  const { sendToAutocab, getBookingDetails, updateBooking } = useAutocab();
  const [jobData, setJobData] = useState<Partial<Job>>(() => {
    // Initialize with current date/time for new bookings
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    return {
      date: currentDate,
      time: currentTime,
      ourReference: "CabCo Assistant",
      customerAccount: "SGH-SAGA" // Default account for Bot Advanced
    };
  });
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<{
    isDuplicate: boolean;
    existingJob?: any;
    message?: string;
    source?: string;
  } | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractContent, setExtractContent] = useState("");

  useEffect(() => {
    if (jobId) {
      getJob(parseInt(jobId)).then(job => {
        if (job) {
          setJobData(job);
        }
      });
    }
  }, [jobId]);

  // Auto-detection with clipboard monitoring - disabled to fix paste button issue
  // Will re-enable with proper UI isolation
  useEffect(() => {
    // Temporarily disabled - clipboard monitoring was interfering with form fields
    return;
  }, [jobId]);

  const extractBookingData = async (content: string) => {
    setIsAutoDetecting(true);
    try {
      const response = await apiRequest("/api/email/extract", {
        method: "POST",
        body: JSON.stringify({ emailContent: content }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data: ExtractedJobData = await response.json();
      
      let formDate = data.date || new Date().toISOString().split('T')[0];
      if (data.date && data.date.includes('/')) {
        const [day, month, year] = data.date.split('/');
        formDate = `${year}-${month}-${day}`;
      }
      
      // SMART EXTRACT ALWAYS PROCESSES NEW EMAIL CONTENT
      // Reset jobId and jobData for new extraction to ensure new job creation
      console.log('🔄 SMART EXTRACT: Processing new email content (clearing existing jobId)');
      setLocation('/bot-advanced'); // Remove jobId from URL to ensure new job creation
      
      setJobData({
        jobNumber: data.jobNumber || `JOB${Date.now()}`,
        date: formDate,
        time: data.time || "09:00",
        pickup: data.pickup || "",
        destination: data.destination || "",
        via1: data.via1 || "",
        via2: data.via2 || "",
        via3: data.via3 || "",
        via4: data.via4 || "",
        via5: data.via5 || "",
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        customerReference: data.customerReference || "",
        customerAccount: "SGH-SAGA", // Set account for Bot Advanced bookings
        passengers: data.passengers || 1,
        luggage: data.luggage || 0,
        vehicleType: data.vehicleType || "Saloon",
        mobilityAids: data.mobilityAids || "",
        price: data.price || "0.00",
        status: "pending",
        driverNotes: `Auto-extracted: ${data.vehicleType || "Saloon"}, Passengers: ${data.passengers || 1}`,
        sentToAutocab: false,
        // CRITICAL FIX: Include all note fields with passenger information from server extraction
        pickupNote: data.pickupNote || "",
        via1Note: data.via1Note || "",
        via2Note: data.via2Note || "",
        via3Note: data.via3Note || "",
        via4Note: data.via4Note || "",
        via5Note: data.via5Note || "",
        destinationNote: data.destinationNote || ""
      });
      
      toast({
        title: "Auto-Extracted",
        description: "Booking data detected and populated automatically",
        duration: 3000,
      });
    } catch (error) {
      console.error('Auto-extraction failed:', error);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const extractFromContent = async (content: string) => {
    console.log('🔄 EXTRACTFROMCONTENT: Starting extraction with content length:', content.length);
    setIsAutoDetecting(true);
    try {
      console.log('🔄 Calling API extraction...');
      const response = await fetch('/api/email/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent: content })
      });
      
      const result = await response.json();
      console.log('📤 API Response:', result);
      
      if (response.ok) {
        console.log('✅ Extraction successful, updating form...');
        
        // Convert date format if needed
        let formDate = result.date || new Date().toISOString().split('T')[0];
        if (result.date && result.date.includes('/')) {
          const [day, month, year] = result.date.split('/');
          formDate = `${year}-${month}-${day}`;
        }
        
        setJobData({
          jobNumber: result.jobNumber || `JOB${Date.now()}`,
          date: formDate,
          time: result.time || "09:00",
          pickup: result.pickup || "",
          destination: result.destination || "",
          via1: result.via1 || "",
          via2: result.via2 || "",
          via3: result.via3 || "",
          via4: result.via4 || "",
          via5: result.via5 || "",
          customerName: result.customerName || "",
          customerPhone: result.customerPhone || "",
          customerReference: result.customerReference || "",
          customerAccount: "SGH-SAGA",
          passengers: result.passengers || 1,
          luggage: result.luggage || 0,
          vehicleType: result.vehicleType || "Saloon",
          mobilityAids: result.mobilityAids || "",
          price: result.price || "0.00",
          status: "pending",
          driverNotes: result.driverNotes || `Auto-extracted: ${result.vehicleType || "Saloon"}`,
          sentToAutocab: false,
          pickupNote: result.pickupNote || "",
          via1Note: result.via1Note || "",
          via2Note: result.via2Note || "",
          via3Note: result.via3Note || "",
          via4Note: result.via4Note || "",
          via5Note: result.via5Note || "",
          destinationNote: result.destinationNote || ""
        });
        
        return result;
      } else {
        throw new Error(result.error || result.message || 'Extraction failed');
      }
    } catch (error) {
      console.error('❌ extractFromContent error:', error);
      throw error;
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleAutoExtract = async () => {
    try {
      setIsAutoDetecting(true);
      
      // Try to read from clipboard automatically
      const clipboardText = await navigator.clipboard.readText();
      
      if (clipboardText.trim()) {
        // If clipboard has content, extract directly
        console.log('📋 Quick Extract: Auto-reading from clipboard');
        await extractFromContent(clipboardText);
        
        toast({
          title: "Quick Extract Complete",
          description: "Data automatically extracted from clipboard",
          duration: 3000,
        });
      } else {
        // If no clipboard content, show notification
        console.log('📋 Quick Extract: No clipboard content found');
        toast({
          title: "Empty Clipboard",
          description: "Please copy booking data to clipboard and try again",
          variant: "destructive",
          duration: 4000,
        });
      }
    } catch (error) {
      // If clipboard access fails (permissions, etc.), show notification
      console.log('📋 Quick Extract: Clipboard access denied:', error);
      toast({
        title: "Clipboard Access Denied",
        description: "Please allow clipboard access or copy data manually",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleManualExtract = async () => {
    if (!extractContent.trim()) {
      toast({
        title: "No Content",
        description: "Please paste a SAGA email first",
        variant: "destructive",
      });
      return;
    }

    setIsAutoDetecting(true);
    
    // Clear all fields first for new job creation
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    setJobData({
      date: currentDate,
      time: currentTime,
      ourReference: "CabCo Assistant"
    });
    
    try {
      await extractFromContent(extractContent.trim());
      setShowExtractModal(false);
      setExtractContent("");
    } catch (error) {
      console.error('Manual extraction failed:', error);
      toast({
        title: "Extraction Failed", 
        description: "Could not process the email content",
        variant: "destructive",
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };



  const handleSaveJob = async () => {
    if (!jobData.jobNumber || !jobData.pickup || !jobData.destination) {
      toast({
        title: "Error",
        description: "Please fill in required fields: Job Number, Pickup, and Destination",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Ensure customerAccount is always SGH-SAGA and autocabBookingId is string
      const updatedJobData = {
        ...jobData,
        customerAccount: "SGH-SAGA",
        autocabBookingId: jobData.autocabBookingId ? String(jobData.autocabBookingId) : undefined
      };

      console.log('🎯 SAVE JOB - Current jobId:', jobId);
      console.log('🎯 SAVE JOB - Job Number:', updatedJobData.jobNumber);

      let savedJob;
      if (jobId) {
        try {
          // Try to update existing job
          await updateJob({ id: parseInt(jobId), data: updatedJobData });
          // Fetch the updated job to ensure we have the latest data
          savedJob = await getJob(parseInt(jobId));
          if (savedJob) {
            setJobData(savedJob);
            toast({
              title: "Success",
              description: "Job updated successfully",
            });
            return savedJob;
          }
        } catch (error) {
          console.log('Job not found, creating new job instead');
          // If job doesn't exist, create a new one - handle duplicates
          return await createJobWithDuplicateHandling(updatedJobData);
        }
      } else {
        console.log('📝 CREATING NEW JOB - No jobId present');
        // Create new job - handle duplicates
        return await createJobWithDuplicateHandling(updatedJobData);
      }
    } catch (error: any) {
      console.error('Save job error:', error);
      toast({
        title: "Error",
        description: "Failed to save job",
        variant: "destructive",
      });
      return null;
    }
  };

  const createJobWithDuplicateHandling = async (updatedJobData: any) => {
    console.log('🚀 STARTING JOB CREATION WITH DATA:', updatedJobData);
    
    try {
      console.log('📞 CALLING createJob MUTATION...');
      const savedJob = await createJob(updatedJobData);
      console.log('✅ JOB CREATED SUCCESSFULLY:', savedJob);
      setJobData(savedJob);
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      setLocation(`/bot-advanced/${savedJob.id}`);
      return savedJob;
    } catch (createError: any) {
      console.error('💥 FRONTEND ERROR CAUGHT:', createError);
      console.log('🔍 ERROR TYPE:', typeof createError);
      console.log('🔍 ERROR CONSTRUCTOR:', createError.constructor.name);
      console.log('🔍 ERROR PROPERTIES:', Object.getOwnPropertyNames(createError));
      console.log('🔍 ERROR STATUS:', createError.status);
      console.log('🔍 ERROR ISDUPLICATE:', createError.isDuplicate);
      console.log('🔍 ERROR EXISTINGJOB:', createError.existingJob);
      console.log('🔍 ERROR MESSAGE:', createError.message);
      console.log('🔍 FULL ERROR OBJECT:', createError);
      
      // Handle duplicate job error specifically - check for 409 status OR duplicate flag
      if ((createError.status === 409 || createError.message?.includes('409')) && createError.isDuplicate) {
        console.log('🎯 DUPLICATE DETECTED - PROCESSING...');
        const existingJob = createError.existingJob;
        const message = existingJob 
          ? `Duplicate Job: ${existingJob.jobNumber} already exists. Customer: ${existingJob.customerName}. ${existingJob.sentToAutocab ? `Already sent to Autocab (ID: ${existingJob.autocabBookingId})` : 'Not yet sent to Autocab'}.`
          : `Job ${updatedJobData.jobNumber} already exists in the system.`;
        
        console.log('📢 SHOWING DUPLICATE MESSAGE:', message);
        toast({
          title: "Duplicate Job Detected",
          description: message,
          variant: "destructive",
          duration: 5000,
        });
        
        if (existingJob) {
          console.log('🔄 REDIRECTING TO EXISTING JOB:', existingJob.id);
          setTimeout(() => {
            setLocation(`/bot-advanced/${existingJob.id}`);
          }, 3000);
        }
        return null;
      } 
      // Also check if the error message contains duplicate information directly
      else if (createError.message && createError.message.includes('already exists')) {
        console.log('🎯 DUPLICATE MESSAGE DETECTED IN ERROR TEXT');
        toast({
          title: "Duplicate Job Detected",
          description: createError.message,
          variant: "destructive",
          duration: 5000,
        });
        return null;
      } 
      else {
        console.log('❌ NOT A DUPLICATE ERROR - SHOWING GENERIC MESSAGE');
        console.log('❌ STATUS CHECK:', createError.status === 409);
        console.log('❌ DUPLICATE CHECK:', createError.isDuplicate);
        console.log('❌ MESSAGE CHECK:', createError.message?.includes('already exists'));
        // Generic error handling
        toast({
          title: "Error", 
          description: createError.message || "Unable to save job before sending to Autocab",
          variant: "destructive",
        });
        return null;
      }
    }
  };

  const checkForDuplicates = async (jobId: number) => {
    try {
      const response = await fetch(`/api/autocab/check-duplicate/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false, message: "Error checking duplicates" };
    }
  };

  const clearForm = () => {
    console.log('🔄 CLEARING FORM: Resetting to new booking state');
    // Reset to default new booking state
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    setJobData({
      date: currentDate,
      time: currentTime,
      ourReference: "CabCo Assistant",
      customerAccount: "SGH-SAGA",
      jobNumber: `JOB${Date.now()}`,
      pickup: "",
      destination: "",
      via1: "",
      via2: "",
      via3: "",
      via4: "",
      via5: "",
      customerName: "",
      customerPhone: "",
      customerReference: "",
      passengers: 1,
      luggage: 0,
      vehicleType: "Saloon",
      mobilityAids: "",
      price: "0.00",
      status: "pending",
      driverNotes: "",
      sentToAutocab: false,
      // Clear all Note fields
      pickupNote: "",
      via1Note: "",
      via2Note: "",
      via3Note: "",
      via4Note: "",
      via5Note: "",
      destinationNote: ""
    });
    
    // Navigate to new booking URL (removes jobId from URL)
    setLocation('/bot-advanced');
    
    toast({
      title: "Form Cleared",
      description: "Ready for new booking",
      duration: 2000,
    });
  };

  const sendJobToAutocab = async (targetJobId: number) => {
    console.log(`🎯 FRONTEND: sendJobToAutocab called with jobId=${targetJobId}`);
    console.log(`🎯 FRONTEND: About to call sendToAutocab hook function`);
    const result = await sendToAutocab({ jobId: targetJobId });
    console.log(`🎯 FRONTEND: sendToAutocab hook returned:`, result);
    
    if (result.success) {
      toast({
        title: "Success",
        description: `Job sent to Autocab successfully. Booking ID: ${result.bookingId || 'Generated'}`,
      });
      
      // Clear the form after successful submission - use setTimeout to ensure state updates properly
      console.log('✅ Job sent successfully - clearing form in 100ms');
      setTimeout(() => {
        clearForm();
        console.log('🔄 Form cleared - should show new booking interface');
      }, 100);
    } else if (result.isDuplicate) {
      // Handle duplicate detection - show dialog instead of error toast
      setDuplicateCheck({
        isDuplicate: true,
        existingJob: result.existingJob,
        message: result.message,
        source: result.source
      });
      setShowDuplicateDialog(true);
    } else {
      toast({
        title: "Error", 
        description: result.message || "Failed to send job to Autocab",
        variant: "destructive",
      });
    }
  };

  const handleEditExistingBooking = () => {
    if (duplicateCheck?.existingJob?.id) {
      setLocation(`/bot-advanced/${duplicateCheck.existingJob.id}`);
      setShowDuplicateDialog(false);
    }
  };

  const handleCreateNewBooking = async () => {
    setShowDuplicateDialog(false);
    if (jobData.id) {
      await sendJobToAutocab(jobData.id);
    }
  };

  const handleSendToAutocab = async () => {
    try {
      console.log('🎯 FRONTEND: handleSendToAutocab started - full workflow');
      
      // Always save current field values first, regardless of whether job exists
      console.log('🎯 FRONTEND: About to call handleSaveJob');
      const savedJob = await handleSaveJob();
      console.log('🎯 FRONTEND: handleSaveJob returned:', savedJob);
      
      if (!savedJob || !savedJob.id) {
        console.log('❌ SEND TO AUTOCAB - Job save failed, checking if it was a duplicate');
        // Job save failed - could be a duplicate, don't show generic error
        // The handleSaveJob function should have already shown the proper duplicate message
        return;
      }

      console.log('✅ SEND TO AUTOCAB - Job saved successfully, checking for duplicates');
      
      // Check for duplicates using the saved job ID
      const duplicateResult = await checkForDuplicates(savedJob.id);
      if (duplicateResult.isDuplicate) {
        console.log('🔍 SEND TO AUTOCAB - Duplicate detected in post-save check');
        setDuplicateCheck(duplicateResult);
        setShowDuplicateDialog(true);
        return;
      }

      console.log('📤 SEND TO AUTOCAB - No duplicates, proceeding to Autocab');
      // No duplicates, proceed with sending to Autocab
      await sendJobToAutocab(savedJob.id);
    } catch (error) {
      console.error('💥 SEND TO AUTOCAB - Workflow error:', error);
      
      // Check if this is a duplicate error that wasn't caught
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && errorMessage.includes('already exists')) {
        console.log('🎯 SEND TO AUTOCAB - Caught duplicate in error message');
        toast({
          title: "Duplicate Job Detected",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send job to Autocab",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile-optimized header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 md:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              {/* Mobile Menu Button */}
              <MobileMenuButton />
              <h1 className="text-base md:text-lg font-semibold text-gray-900 hidden md:block">Advanced Booking</h1>
              <div className="hidden md:block h-4 w-px bg-gray-300"></div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 hidden md:flex"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button 
                onClick={async () => {
                  console.log('🚀 QUICK EXTRACT HEADER BUTTON CLICKED');
                  setIsAutoDetecting(true);
                  
                  try {
                    console.log('📋 Trying to read clipboard...');
                    const text = await navigator.clipboard.readText();
                    console.log('✅ Clipboard content length:', text.length);
                    console.log('📝 First 100 chars:', text.substring(0, 100));
                    
                    if (!text.trim()) {
                      toast({
                        title: "Empty Clipboard",
                        description: "Please copy SAGA email to clipboard first",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    console.log('🔄 Calling API extraction...');
                    const response = await fetch('/api/email/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ emailContent: text })
                    });
                    
                    const result = await response.json();
                    console.log('📤 API Response:', result);
                    
                    if (result.success) {
                      console.log('✅ Extraction successful, updating form...');
                      await extractFromContent(result.data);
                      
                      toast({
                        title: "Quick Extract Complete",
                        description: `Job ${result.data.jobNumber} extracted successfully`,
                      });
                    } else {
                      throw new Error(result.error || 'Extraction failed');
                    }
                  } catch (error) {
                    console.error('❌ Quick Extract error:', error);
                    toast({
                      title: "Quick Extract Failed",
                      description: (error as Error).message || "Failed to process clipboard content",
                      variant: "destructive",
                    });
                  } finally {
                    setIsAutoDetecting(false);
                  }
                }}
                disabled={isAutoDetecting}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-6 px-1 md:text-sm md:h-auto md:px-3"
                title="Quick Extract from clipboard"
              >
                <Wand2 className={`mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4 ${isAutoDetecting ? "animate-spin" : ""}`} />
                <span className="md:inline">Quick</span>
              </Button>

              <Button 
                onClick={clearForm}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-xs h-6 px-1 md:text-sm md:h-auto md:px-3"
                title="Clear all form fields"
              >
                <X className="mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4" />
                <span className="md:inline">Clear</span>
              </Button>

              <Button 
                onClick={handleSaveJob} 
                variant="outline"
                size="sm"
                className="border-gray-300 text-xs h-6 px-1 md:text-sm md:h-auto md:px-3"
              >
                <Save className="mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4" />
                <span className="md:inline">Save</span>
              </Button>

              {/* Load Current Autocab Details Button (only show if job has booking ID) */}
              {jobData.autocabBookingId && (
                <Button 
                  onClick={async () => {
                    try {
                      const autocabData = await getBookingDetails(jobData.autocabBookingId!);
                      if (autocabData.success && autocabData.booking) {
                        const booking = autocabData.booking;
                        
                        // Update form with current Autocab booking details
                        setJobData(prev => ({
                          ...prev,
                          customerName: booking.name || prev.customerName,
                          customerPhone: booking.telephoneNumber || prev.customerPhone,
                          pickup: booking.pickup?.address?.text || prev.pickup,
                          destination: booking.destination?.address?.text || prev.destination,
                          driverNotes: booking.driverNote || prev.driverNotes,
                        }));
                        
                        toast({
                          title: "Autocab Details Loaded",
                          description: `Current details loaded from booking ${jobData.autocabBookingId}. Driver: ${booking.driverDetails?.name || 'Not assigned'}, Vehicle: ${booking.vehicleDetails?.registration || 'Not assigned'}`,
                        });
                      } else {
                        toast({
                          title: "Failed to Load Details",
                          description: "Could not fetch current booking details from Autocab",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to load booking details",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs h-6 px-1 md:text-sm md:h-auto md:px-3 hidden md:flex"
                >
                  <RefreshCw className="mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline">Load Current Autocab Details</span>
                </Button>
              )}

              <Button 
                onClick={() => {
                  console.log('🎯 BUTTON CLICKED: Send to Autocab button clicked');
                  handleSendToAutocab();
                }} 
                size="sm"
                className={`text-xs h-6 px-1 md:text-sm md:h-auto md:px-3 ${
                  jobData.autocabBookingId 
                    ? "bg-orange-600 hover:bg-orange-700 text-white" 
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <Send className="mr-0.5 md:mr-1 h-3 w-3 md:h-4 md:w-4" />
                <span className="md:inline">{jobData.autocabBookingId ? "Update" : "Send"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area - Mobile Optimized */}
        <div className="flex-1 overflow-hidden">
          {/* Mobile: Single panel without map, Desktop: Resizable panels with map */}
          <div className="h-full md:hidden">
            {/* Mobile: Single scrollable form without map */}
            <div className="h-full px-0.5 py-0.5 overflow-y-auto bg-white">
              {/* Ultra-compact Mobile Form */}
              <div className="space-y-0.5">
                {/* Pickup Time */}
                <div className="flex items-center gap-1 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Time</Label>
                  <div className="flex gap-0.5 w-3/4 md:flex-1 ml-8">
                    <Input
                      type="date"
                      value={jobData.date || ""}
                      onChange={(e) => setJobData({...jobData, date: e.target.value})}
                      className="text-xs h-6 flex-1"
                    />
                    <Input
                      type="time"
                      value={jobData.time || ""}
                      onChange={(e) => setJobData({...jobData, time: e.target.value})}
                      className="text-xs h-6 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-1"
                      onClick={() => {
                        const now = new Date();
                        const currentDate = now.toISOString().split('T')[0];
                        const currentTime = now.toTimeString().slice(0, 5);
                        setJobData({...jobData, date: currentDate, time: currentTime});
                      }}
                    >
                      NOW
                    </Button>
                  </div>
                </div>

                {/* Pickup */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Pickup</Label>
                    <Input
                      value={jobData.pickup || ""}
                      onChange={(e) => setJobData({...jobData, pickup: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="Pickup address"
                    />
                  </div>
                  {jobData.pickupNote && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                      <span className="font-medium">Note:</span> {jobData.pickupNote}
                    </div>
                  )}
                </div>

                  {/* Via 1 - Mobile optimized */}
                {(jobData.via1 || jobData.via2 || jobData.via3 || jobData.via4 || jobData.via5) && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <Label className="text-xs font-medium text-blue-700 w-12 flex-shrink-0 ml-2">Via 1</Label>
                      <Input
                        value={jobData.via1 || ""}
                        onChange={(e) => setJobData({...jobData, via1: e.target.value})}
                        className="text-xs h-6 w-3/4 md:flex-1 border-blue-300 focus:border-blue-500 ml-8"
                        placeholder="Via point 1"
                      />
                    </div>
                    {jobData.via1Note && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                        <span className="font-medium">Note:</span> {jobData.via1Note}
                      </div>
                    )}
                  </div>
                )}

                {/* Via 2 - Mobile optimized */}
                {(jobData.via1 && (jobData.via2 || jobData.via3 || jobData.via4 || jobData.via5)) && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <Label className="text-xs font-medium text-blue-700 w-12 flex-shrink-0 ml-2">Via 2</Label>
                      <Input
                        value={jobData.via2 || ""}
                        onChange={(e) => setJobData({...jobData, via2: e.target.value})}
                        className="text-xs h-6 w-3/4 md:flex-1 border-blue-300 focus:border-blue-500 ml-8"
                        placeholder="Via point 2"
                      />
                    </div>
                    {jobData.via2Note && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                        <span className="font-medium">Note:</span> {jobData.via2Note}
                      </div>
                    )}
                  </div>
                )}

                  {/* Via 3 - Mobile optimized */}
                {(jobData.via2 && (jobData.via3 || jobData.via4 || jobData.via5)) && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <Label className="text-xs font-medium text-blue-700 w-12 flex-shrink-0 ml-2">Via 3</Label>
                      <Input
                        value={jobData.via3 || ""}
                        onChange={(e) => setJobData({...jobData, via3: e.target.value})}
                        className="text-xs h-6 w-3/4 md:flex-1 border-blue-300 focus:border-blue-500 ml-8"
                        placeholder="Via point 3"
                      />
                    </div>
                    {jobData.via3Note && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                        <span className="font-medium">Note:</span> {jobData.via3Note}
                      </div>
                    )}
                  </div>
                )}

                {/* Via 4 - Mobile optimized */}
                {(jobData.via3 && (jobData.via4 || jobData.via5)) && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <Label className="text-xs font-medium text-blue-700 w-12 flex-shrink-0 ml-2">Via 4</Label>
                      <Input
                        value={jobData.via4 || ""}
                        onChange={(e) => setJobData({...jobData, via4: e.target.value})}
                        className="text-xs h-6 w-3/4 md:flex-1 border-blue-300 focus:border-blue-500 ml-8"
                        placeholder="Via point 4"
                      />
                    </div>
                    {jobData.via4Note && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                        <span className="font-medium">Note:</span> {jobData.via4Note}
                      </div>
                    )}
                  </div>
                )}

                {/* Via 5 - Mobile optimized */}
                {jobData.via4 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 py-0.5">
                      <Label className="text-xs font-medium text-blue-700 w-12 flex-shrink-0 ml-2">Via 5</Label>
                      <Input
                        value={jobData.via5 || ""}
                        onChange={(e) => setJobData({...jobData, via5: e.target.value})}
                        className="text-xs h-6 w-3/4 md:flex-1 border-blue-300 focus:border-blue-500 ml-8"
                        placeholder="Via point 5"
                      />
                    </div>
                    {jobData.via5Note && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                        <span className="font-medium">Note:</span> {jobData.via5Note}
                      </div>
                    )}
                  </div>
                )}

                {/* Destination */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Destination</Label>
                    <Input
                      value={jobData.destination || ""}
                      onChange={(e) => setJobData({...jobData, destination: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="Destination address"
                    />
                  </div>
                  {jobData.destinationNote && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-0.5 rounded border border-blue-200">
                      <span className="font-medium">Note:</span> {jobData.destinationNote}
                    </div>
                  )}
                </div>

                {/* Customer Details - Ultra-compact mobile */}
                <div className="flex items-center gap-1 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Name</Label>
                  <Input
                    value={jobData.customerName || ""}
                    onChange={(e) => setJobData({...jobData, customerName: e.target.value})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Customer name"
                  />
                </div>

                <div className="flex items-center gap-1 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Phone</Label>
                  <Input
                    value={jobData.customerPhone || ""}
                    onChange={(e) => setJobData({...jobData, customerPhone: e.target.value})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Phone number"
                  />
                </div>

                <div className="flex items-center gap-0.5 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Vehicle</Label>
                  <Input
                    value={jobData.capabilities || ""}
                    onChange={(e) => setJobData({...jobData, capabilities: e.target.value})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Vehicle type"
                  />
                </div>

                <div className="flex items-center gap-0.5 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Passengers</Label>
                  <Input
                    type="number"
                    value={jobData.passengers || 0}
                    onChange={(e) => setJobData({...jobData, passengers: parseInt(e.target.value) || 0})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Count"
                  />
                  </div>

                  {/* Requested Vehicles */}
                  <div className="flex items-center gap-0.5 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Req Veh</Label>
                    <Input
                      value={jobData.vehicleType || ""}
                      onChange={(e) => setJobData({...jobData, vehicleType: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="Vehicle type"
                    />
                  </div>

                  {/* Requested Drivers */}
                  <div className="flex items-center gap-0.5 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Req Drv</Label>
                    <Input
                      value={jobData.requestedDrivers || ""}
                      onChange={(e) => setJobData({...jobData, requestedDrivers: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="Requested drivers"
                    />
                  </div>

                  {/* Account */}
                  <div className="flex items-center gap-0.5 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Account</Label>
                    <Input
                      value={jobData.customerAccount || "SGH-SAGA"}
                      onChange={(e) => setJobData({...jobData, customerAccount: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    />
                  </div>

                  {/* Your Reference */}
                  <div className="flex items-center gap-0.5 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Your Ref</Label>
                    <Input
                      value={jobData.jobNumber || ""}
                      onChange={(e) => setJobData({...jobData, jobNumber: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="Job reference"
                    />
                  </div>

                  {/* Our Reference */}
                  <div className="flex items-center gap-0.5 py-0.5">
                    <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Our Ref</Label>
                    <Input
                      value={jobData.ourReference || "CabCo Assistant"}
                      onChange={(e) => setJobData({...jobData, ourReference: e.target.value})}
                      className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                      placeholder="CabCo Assistant"
                    />
                </div>

                <div className="flex items-center gap-0.5 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Luggage</Label>
                  <Input
                    type="number"
                    value={jobData.luggage || 0}
                    onChange={(e) => setJobData({...jobData, luggage: parseInt(e.target.value) || 0})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Count"
                  />
                </div>

                <div className="flex items-center gap-0.5 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Job Ref</Label>
                  <Input
                    value={jobData.jobNumber || ""}
                    onChange={(e) => setJobData({...jobData, jobNumber: e.target.value})}
                    className="text-xs h-6 w-3/4 md:flex-1 ml-8"
                    placeholder="Job reference"
                  />
                </div>

                <div className="flex items-center gap-0.5 py-0.5">
                  <Label className="text-xs font-medium text-gray-700 w-12 flex-shrink-0 ml-2">Price</Label>
                  <div className="flex gap-0.5 items-center w-3/4 md:flex-1 ml-8">
                    <span className="text-xs">£</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={jobData.price || ""}
                      onChange={(e) => setJobData({...jobData, price: e.target.value || "0"})}
                      className="text-xs h-6 flex-1"
                      placeholder="0.00"
                    />
                    <Button 
                      size="sm" 
                      className="text-xs h-6 bg-orange-600 hover:bg-orange-700 text-white px-0.5"
                      onClick={() => setShowPriceModal(true)}
                    >
                      INSERT
                    </Button>
                  </div>
                </div>

                {/* Save/Send buttons - Ultra-compact */}
                <div className="flex gap-0.5 pt-0.5">
                  <Button 
                    onClick={handleSaveJob} 
                    className="flex-1 text-xs h-6 bg-blue-600 hover:bg-blue-700 text-white px-0.5"
                  >
                    <Save className="mr-0.5 h-3 w-3" />
                    Save
                  </Button>
                  <Button 
                    onClick={handleSendToAutocab} 
                    className="flex-1 text-xs h-6 bg-green-600 hover:bg-green-700 text-white px-0.5"
                  >
                    <Send className="mr-0.5 h-3 w-3" />
                    Send to Autocab
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop version with map - Hidden on mobile */}
          <div className="hidden md:block h-full">
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Top Panel - Booking Fields and Map */}
              <ResizablePanel defaultSize={65} minSize={40}>
                <ResizablePanelGroup direction="horizontal">
                  {/* Left Panel - Booking Fields */}
                  <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="h-full p-2 overflow-y-auto bg-white">
                      {/* Header Buttons - Desktop Version */}
                      <div className="flex gap-2 items-center mb-4">
                        <Button 
                          onClick={async () => {
                            console.log('🔥 DESKTOP SMART EXTRACT BUTTON CLICKED');
                            console.log('🔍 Current jobData before extraction:', JSON.stringify({
                              jobNumber: jobData.jobNumber,
                              pickup: jobData.pickup,
                              destination: jobData.destination
                            }, null, 2));
                            
                            try {
                              await handleAutoExtract();
                              console.log('✅ handleAutoExtract completed');
                              
                              setTimeout(() => {
                                console.log('🔍 jobData after extraction (after 500ms):', JSON.stringify({
                                  jobNumber: jobData.jobNumber,
                                  pickup: jobData.pickup,
                                  destination: jobData.destination,
                                  customerPhone: jobData.customerPhone,
                                  vehicleType: jobData.vehicleType
                                }, null, 2));
                              }, 500);
                            } catch (error) {
                              console.error('❌ Smart Extract error:', error);
                            }
                          }}
                          disabled={isAutoDetecting}
                          className="text-sm h-10 bg-purple-600 hover:bg-purple-700 text-white px-4"
                        >
                          <Wand2 className={`mr-2 h-4 w-4 ${isAutoDetecting ? "animate-spin" : ""}`} />
                          Smart Extract
                        </Button>
                        <Button 
                          onClick={clearForm}
                          className="text-sm h-10 bg-red-600 hover:bg-red-700 text-white px-4"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Clear
                        </Button>
                        {jobData.autocabBookingId && (
                          <Button 
                            onClick={async () => {
                              try {
                                const autocabData = await getBookingDetails(jobData.autocabBookingId!);
                                if (autocabData.success && autocabData.booking) {
                                  const booking = autocabData.booking;
                                  
                                  // Update form with current Autocab booking details
                                  setJobData((prev: Partial<Job>) => ({
                                    ...prev,
                                    customerName: booking.name || prev.customerName,
                                    customerPhone: booking.telephoneNumber || prev.customerPhone,
                                    pickup: booking.pickup?.address?.text || prev.pickup,
                                    destination: booking.destination?.address?.text || prev.destination,
                                    driverNotes: booking.driverNote || prev.driverNotes,
                                  }));
                                  
                                  toast({
                                    title: "Autocab Details Loaded",
                                    description: `Current details loaded from booking ${jobData.autocabBookingId}. Driver: ${booking.driverDetails?.name || 'Not assigned'}, Vehicle: ${booking.vehicleDetails?.registration || 'Not assigned'}`,
                                  });
                                } else {
                                  toast({
                                    title: "Failed to Load Details",
                                    description: "Could not fetch current booking details from Autocab",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to load booking details",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="text-sm h-10 bg-orange-600 hover:bg-orange-700 text-white px-4"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Load Current Autocab Details
                          </Button>
                        )}
                      </div>
                      
                      {/* AUTOCAB-Style Enhanced Form - Desktop */}
                      <div className="space-y-1">
                        {/* Pickup Time */}
                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Pickup Time</Label>
                          <div className="flex gap-1 flex-1">
                            <Input
                              type="date"
                              value={jobData.date || ""}
                              onChange={(e) => setJobData({...jobData, date: e.target.value})}
                              className="text-sm h-9"
                            />
                            <Input
                              type="time"
                              value={jobData.time || ""}
                              onChange={(e) => setJobData({...jobData, time: e.target.value})}
                              className="text-sm h-9"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 px-2"
                              onClick={() => {
                                const now = new Date();
                                const currentDate = now.toISOString().split('T')[0];
                                const currentTime = now.toTimeString().slice(0, 5);
                                setJobData({...jobData, date: currentDate, time: currentTime});
                              }}
                            >
                              ASAP
                            </Button>
                          </div>
                        </div>

                        {/* Pickup Address */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 py-0.5">
                            <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Pickup Address</Label>
                            <Input
                              value={jobData.pickup || ""}
                              onChange={(e) => setJobData({...jobData, pickup: e.target.value})}
                              className="text-sm h-9 flex-1"
                              placeholder="Pickup address"
                            />
                          </div>
                          {jobData.pickupNote && (
                            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                              <span className="font-medium">Note:</span> {jobData.pickupNote}
                            </div>
                          )}
                        </div>

                        {/* Via Points */}
                        {(jobData.via1 || jobData.via2 || jobData.via3 || jobData.via4 || jobData.via5) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 py-0.5">
                              <Label className="text-sm font-medium text-blue-700 w-32 flex-shrink-0">Via 1</Label>
                              <Input
                                value={jobData.via1 || ""}
                                onChange={(e) => setJobData({...jobData, via1: e.target.value})}
                                className="text-sm h-9 flex-1 border-blue-300 focus:border-blue-500"
                                placeholder="Via point 1"
                              />
                            </div>
                            {jobData.via1Note && (
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                                <span className="font-medium">Note:</span> {jobData.via1Note}
                              </div>
                            )}
                          </div>
                        )}

                        {(jobData.via1 && (jobData.via2 || jobData.via3 || jobData.via4 || jobData.via5)) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 py-0.5">
                              <Label className="text-sm font-medium text-blue-700 w-32 flex-shrink-0">Via 2</Label>
                              <Input
                                value={jobData.via2 || ""}
                                onChange={(e) => setJobData({...jobData, via2: e.target.value})}
                                className="text-sm h-9 flex-1 border-blue-300 focus:border-blue-500"
                                placeholder="Via point 2"
                              />
                            </div>
                            {jobData.via2Note && (
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                                <span className="font-medium">Note:</span> {jobData.via2Note}
                              </div>
                            )}
                          </div>
                        )}

                        {(jobData.via2 && (jobData.via3 || jobData.via4 || jobData.via5)) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 py-0.5">
                              <Label className="text-sm font-medium text-blue-700 w-32 flex-shrink-0">Via 3</Label>
                              <Input
                                value={jobData.via3 || ""}
                                onChange={(e) => setJobData({...jobData, via3: e.target.value})}
                                className="text-sm h-9 flex-1 border-blue-300 focus:border-blue-500"
                                placeholder="Via point 3"
                              />
                            </div>
                            {jobData.via3Note && (
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                                <span className="font-medium">Note:</span> {jobData.via3Note}
                              </div>
                            )}
                          </div>
                        )}

                        {(jobData.via3 && (jobData.via4 || jobData.via5)) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 py-0.5">
                              <Label className="text-sm font-medium text-blue-700 w-32 flex-shrink-0">Via 4</Label>
                              <Input
                                value={jobData.via4 || ""}
                                onChange={(e) => setJobData({...jobData, via4: e.target.value})}
                                className="text-sm h-9 flex-1 border-blue-300 focus:border-blue-500"
                                placeholder="Via point 4"
                              />
                            </div>
                            {jobData.via4Note && (
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                                <span className="font-medium">Note:</span> {jobData.via4Note}
                              </div>
                            )}
                          </div>
                        )}

                        {jobData.via4 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 py-0.5">
                              <Label className="text-sm font-medium text-blue-700 w-32 flex-shrink-0">Via 5</Label>
                              <Input
                                value={jobData.via5 || ""}
                                onChange={(e) => setJobData({...jobData, via5: e.target.value})}
                                className="text-sm h-9 flex-1 border-blue-300 focus:border-blue-500"
                                placeholder="Via point 5"
                              />
                            </div>
                            {jobData.via5Note && (
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                                <span className="font-medium">Note:</span> {jobData.via5Note}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Destination */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 py-0.5">
                            <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Destination</Label>
                            <Input
                              value={jobData.destination || ""}
                              onChange={(e) => setJobData({...jobData, destination: e.target.value})}
                              className="text-sm h-9 flex-1"
                              placeholder="Destination address"
                            />
                          </div>
                          {jobData.destinationNote && (
                            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 ml-34">
                              <span className="font-medium">Note:</span> {jobData.destinationNote}
                            </div>
                          )}
                        </div>

                        {/* Customer Details */}
                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Customer Name</Label>
                          <Input
                            value={jobData.customerName || ""}
                            onChange={(e) => setJobData({...jobData, customerName: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Customer name"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Phone Number</Label>
                          <Input
                            value={jobData.customerPhone || ""}
                            onChange={(e) => setJobData({...jobData, customerPhone: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Phone number"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Vehicle Type</Label>
                          <Input
                            value={jobData.capabilities || ""}
                            onChange={(e) => setJobData({...jobData, capabilities: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Vehicle type"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Passengers</Label>
                          <Input
                            type="number"
                            value={jobData.passengers || 0}
                            onChange={(e) => setJobData({...jobData, passengers: parseInt(e.target.value) || 0})}
                            className="text-sm h-9 flex-1"
                            placeholder="Number of passengers"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Luggage</Label>
                          <Input
                            type="number"
                            value={jobData.luggage || 0}
                            onChange={(e) => setJobData({...jobData, luggage: parseInt(e.target.value) || 0})}
                            className="text-sm h-9 flex-1"
                            placeholder="Luggage pieces"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Requested Vehicle</Label>
                          <Input
                            value={jobData.vehicleType || ""}
                            onChange={(e) => setJobData({...jobData, vehicleType: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Requested vehicle"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Requested Driver</Label>
                          <Input
                            value={jobData.requestedDrivers || ""}
                            onChange={(e) => setJobData({...jobData, requestedDrivers: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Requested driver"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Account</Label>
                          <Input
                            value={jobData.customerAccount || "SGH-SAGA"}
                            onChange={(e) => setJobData({...jobData, customerAccount: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Customer account"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Your Reference</Label>
                          <Input
                            value={jobData.jobNumber || ""}
                            onChange={(e) => setJobData({...jobData, jobNumber: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Job number"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Our Reference</Label>
                          <Input
                            value={jobData.ourReference || "CabCo Assistant"}
                            onChange={(e) => setJobData({...jobData, ourReference: e.target.value})}
                            className="text-sm h-9 flex-1"
                            placeholder="Our reference"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                          <Label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">Price</Label>
                          <div className="flex gap-2 items-center flex-1">
                            <span className="text-sm">£</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={jobData.price || ""}
                              onChange={(e) => setJobData({...jobData, price: e.target.value})}
                              className="text-sm h-9 flex-1"
                              placeholder="0.00"
                            />
                            <Button
                              size="sm"
                              className="text-sm h-9 bg-orange-600 hover:bg-orange-700 text-white"
                              onClick={() => setShowPriceModal(true)}
                            >
                              INSERT
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleSaveJob} 
                            className="flex-1 text-sm h-10 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Job
                          </Button>
                          <Button 
                            onClick={() => {
                              console.log('🎯 BUTTON CLICKED: Desktop Send to Autocab button clicked');
                              handleSendToAutocab();
                            }} 
                            className="flex-1 text-sm h-10 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {jobData.autocabBookingId ? "Update" : "Send to Autocab"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle className="w-2 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex items-center justify-center">
              <div className="w-1 h-6 bg-gray-400 rounded"></div>
            </ResizableHandle>

            {/* Right Panel - AUTOCAB Live Interface */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full bg-gray-50 p-2">
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Map Panel */}
                  <ResizablePanel defaultSize={70} minSize={30}>
                    <div className="h-full bg-white rounded border">
                      <GoogleMapsPanel />
                    </div>
                  </ResizablePanel>
                  
                  {/* Vertical Resize Handle */}
                  <ResizableHandle className="h-2 bg-gray-200 hover:bg-gray-300 cursor-row-resize flex items-center justify-center my-1">
                    <div className="h-1 w-6 bg-gray-400 rounded"></div>
                  </ResizableHandle>
                  
                  {/* Live Bookings Panel */}
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="h-full bg-white rounded border">
                      <AutocabLiveBookings />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    </div>

    {/* Price Edit Modal */}
    <PriceEditModal
      isOpen={showPriceModal}
      onClose={() => setShowPriceModal(false)}
      currentCost={parseFloat(typeof jobData.price === 'string' ? jobData.price : String(jobData.price || "0"))}
      currentPrice={parseFloat(typeof jobData.price === 'string' ? jobData.price : String(jobData.price || "0"))}
      onSave={(cost: number, price: number) => {
        setJobData({...jobData, price: price.toString()});
        toast({
          title: "Price Updated",
          description: `Manual price set to £${price.toFixed(2)}`,
        });
      }}
    />

    {/* Duplicate Booking Warning Dialog */}
    <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-orange-600">⚠️ Duplicate Booking Detected</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            {duplicateCheck?.message}
          </p>
          {duplicateCheck?.existingJob && (
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="text-sm">
                <div className="font-medium">Existing Booking Details:</div>
                <div>Job Number: {duplicateCheck.existingJob.jobNumber}</div>
                <div>Date: {duplicateCheck.existingJob.date}</div>
                <div>Time: {duplicateCheck.existingJob.time}</div>
                <div>From: {duplicateCheck.existingJob.pickup}</div>
                <div>To: {duplicateCheck.existingJob.destination}</div>
                <div>Customer: {duplicateCheck.existingJob.customerName}</div>
                <div>Price: £{duplicateCheck.existingJob.price}</div>
                {duplicateCheck.existingJob.autocabBookingId && (
                  <div className="font-medium text-green-600">
                    Autocab Booking ID: {duplicateCheck.existingJob.autocabBookingId}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="text-sm font-medium text-gray-900 mb-3">
            Do you want to edit the existing booking instead?
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleCreateNewBooking}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              No - Create New
            </Button>
            <Button
              onClick={handleEditExistingBooking}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Yes - Edit Existing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Smart Extract Modal */}
    <Dialog open={showExtractModal} onOpenChange={setShowExtractModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Smart Extract - SAGA Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Paste SAGA Email Content Below:</Label>
            <Textarea
              value={extractContent}
              onChange={(e) => setExtractContent(e.target.value)}
              placeholder="Paste your SAGA email content here..."
              className="min-h-[300px] mt-2"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowExtractModal(false);
                setExtractContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualExtract}
              disabled={isAutoDetecting || !extractContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Wand2 className={`mr-1 h-4 w-4 ${isAutoDetecting ? "animate-spin" : ""}`} />
              {isAutoDetecting ? "Extracting..." : "Extract Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
    </div>
  );
}
