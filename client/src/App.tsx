import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Dashboard from "@/pages/dashboard";
import BotAdvanced from "@/pages/bot-advanced";
import DriverDashboard from "@/pages/driver-dashboard";
import CabcoDriversApp from "@/pages/cabco-drivers-app";
import CabcoDriverMobile from "@/pages/cabco-driver-mobile";

import UberStyleBooking from "@/pages/uber-style-booking";
import AutocabBooking from "@/pages/autocab-booking";
import EmailProcessor from "@/pages/email-processor";
import DriversPage from "@/pages/drivers";
import SettingsPage from "@/pages/settings";
import AutocabInterfacePage from "@/pages/autocab-interface";
import AIChatPage from "@/pages/ai-chat";
import DriverShiftsReport from "@/pages/driver-shifts-report";
import FleetManagement from "@/pages/fleet-management";
import { AdvancedBookings } from "@/pages/advanced-bookings";
import { SearchBookings } from "@/pages/search-bookings";
import DriversAssignments from "@/pages/drivers-assignments";
import GlobalSearch from "@/pages/global-search";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import LoadingAnimation from "@/components/loading/loading-animation";

function Router() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Handle Gmail OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const gmailSuccess = urlParams.get('gmail_success');
    const gmailError = urlParams.get('gmail_error');

    if (gmailSuccess === 'true') {
      toast({
        title: "Gmail Connected",
        description: "Successfully connected to Gmail account",
      });
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Invalidate Gmail status to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/gmail/status'] });
    } else if (gmailError) {
      toast({
        title: "Gmail Connection Failed", 
        description: `Error: ${gmailError}`,
        variant: "destructive",
      });
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleLoadingComplete = () => {
    setShowLoading(false);
    // Navigate directly to Autocab Interface after loading animation
    setLocation('/autocab-interface');
  };

  // Show loading animation first time only
  if (showLoading && location === '/') {
    return <LoadingAnimation onComplete={handleLoadingComplete} />;
  }

  return (
    <Switch>

      
      {/* Mobile AI Chat - Full Screen Layout */}
      <Route path="/ai-chat-mobile">
        <div className="min-h-screen bg-gray-50">
          <AIChatPage />
        </div>
      </Route>
      
      {/* Uber Style Booking - Full Screen Layout */}
      <Route path="/uber-booking">
        <UberStyleBooking />
      </Route>
      
      {/* Uber Style Booking Alternative Path */}
      <Route path="/uber-style-booking">
        <UberStyleBooking />
      </Route>
      
      {/* Driver Dashboard - Full Screen Layout */}
      <Route path="/driver">
        <DriverDashboard />
      </Route>
      
      {/* CABCO Driver Mobile App - Full Screen Layout */}
      <Route path="/cabco-driver">
        <CabcoDriverMobile />
      </Route>
      
      {/* All Other Pages - Standard Layout with Sidebar */}
      <Route>
        <div className="min-h-screen flex bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Switch>
              <Route path="/" component={BotAdvanced} />
              <Route path="/bot-advanced" component={BotAdvanced} />
              <Route path="/bot-advanced/:jobId" component={BotAdvanced} />

              <Route path="/autocab" component={AutocabBooking} />
              <Route path="/autocab-interface" component={AutocabInterfacePage} />
              <Route path="/ai-chat" component={AIChatPage} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/email-processor" component={EmailProcessor} />
              <Route path="/drivers" component={DriversPage} />
              <Route path="/cabco-drivers-app" component={CabcoDriversApp} />
              <Route path="/drivers-assignments" component={DriversAssignments} />
              <Route path="/driver-shifts-report" component={DriverShiftsReport} />
              <Route path="/fleet-management" component={FleetManagement} />
              <Route path="/advanced-bookings" component={() => <AdvancedBookings />} />
              <Route path="/search-bookings" component={SearchBookings} />
              <Route path="/global-search" component={GlobalSearch} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
