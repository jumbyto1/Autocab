import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  Bot, 
  Mail, 
  Cloud, 
  Map, 
  Settings,
  CarTaxiFront,
  Calendar,
  Users,
  ChevronRight,
  ChevronDown,
  FileText,
  Menu,
  X,
  Car,
  UserCheck,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "AUTOCAB Interface", href: "/autocab-interface", icon: CarTaxiFront },
  { name: "Bot Advanced", href: "/", icon: Bot },
  { name: "Uber Style", href: "/uber-booking", icon: CarTaxiFront },
  { name: "AI Chat", href: "/ai-chat", icon: Bot },
  { name: "Global Search", href: "/global-search", icon: Search },
  { name: "Job Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Email Processor", href: "/email-processor", icon: Mail },
];

const driversMenu = {
  name: "Drivers",
  icon: Users,
  subItems: [
    { name: "Driver Overview", href: "/drivers", icon: Users },
    { name: "CABCO DRIVERS APP", href: "/cabco-drivers-app", icon: CarTaxiFront },
    { name: "Assignments", href: "/drivers-assignments", icon: UserCheck },
    { name: "Shifts Report", href: "/driver-shifts-report", icon: FileText },
  ]
};

const vehiclesMenu = {
  name: "Vehicles",
  icon: Car,
  subItems: [
    { name: "Fleet Management", href: "/fleet-management", icon: Users },
  ]
};

const bookingsMenu = {
  name: "Bookings",
  icon: Calendar,
  subItems: [
    { name: "Advanced Bookings", href: "/advanced-bookings", icon: Calendar },
    { name: "Search Bookings", href: "/search-bookings", icon: Search },
  ]
};

const integration = [
  { name: "Autocab API", href: "#", icon: Cloud },
  { name: "Route Manager", href: "#", icon: Map },
];

// Navigation menu component that renders navigation items
function NavigationMenu({ onItemClick }: { onItemClick?: () => void }) {
  const [location] = useLocation();
  const [isDriversExpanded, setIsDriversExpanded] = useState(false);
  const [isVehiclesExpanded, setIsVehiclesExpanded] = useState(false);
  const [isBookingsExpanded, setIsBookingsExpanded] = useState(false);
  
  // Check if any drivers submenu item is active
  const isDriversActive = driversMenu.subItems.some(item => location === item.href);
  
  // Check if any vehicles submenu item is active
  const isVehiclesActive = vehiclesMenu.subItems.some(item => location === item.href);
  
  // Check if any bookings submenu item is active
  const isBookingsActive = bookingsMenu.subItems.some(item => location === item.href);
  
  return (
    <nav className="space-y-1">
      <div className="px-6 py-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</p>
      </div>
      
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href} onClick={onItemClick}>
            <div className={cn(
              "flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
              isActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
            )}>
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </div>
          </Link>
        );
      })}
      
      {/* Drivers Menu with Submenu */}
      <div>
        <div 
          className={cn(
            "flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
            isDriversActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
          )}
          onClick={() => setIsDriversExpanded(!isDriversExpanded)}
        >
          <div className="flex items-center">
            <driversMenu.icon className="h-5 w-5 mr-3" />
            {driversMenu.name}
          </div>
          {isDriversExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        
        {isDriversExpanded && (
          <div className="ml-6 border-l border-gray-200">
            {driversMenu.subItems.map((subItem) => {
              const isSubActive = location === subItem.href;
              return (
                <Link key={subItem.name} href={subItem.href} onClick={onItemClick}>
                  <div className={cn(
                    "flex items-center px-6 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
                    isSubActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
                  )}>
                    <subItem.icon className="h-4 w-4 mr-3" />
                    {subItem.name}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Vehicles Menu with Submenu */}
      <div>
        <div 
          className={cn(
            "flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
            isVehiclesActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
          )}
          onClick={() => setIsVehiclesExpanded(!isVehiclesExpanded)}
        >
          <div className="flex items-center">
            <vehiclesMenu.icon className="h-5 w-5 mr-3" />
            {vehiclesMenu.name}
          </div>
          {isVehiclesExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        
        {isVehiclesExpanded && (
          <div className="ml-6 border-l border-gray-200">
            {vehiclesMenu.subItems.map((subItem) => {
              const isSubActive = location === subItem.href;
              return (
                <Link key={subItem.name} href={subItem.href} onClick={onItemClick}>
                  <div className={cn(
                    "flex items-center px-6 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
                    isSubActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
                  )}>
                    <subItem.icon className="h-4 w-4 mr-3" />
                    {subItem.name}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Bookings Menu with Submenu */}
      <div>
        <div 
          className={cn(
            "flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
            isBookingsActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
          )}
          onClick={() => setIsBookingsExpanded(!isBookingsExpanded)}
        >
          <div className="flex items-center">
            <bookingsMenu.icon className="h-5 w-5 mr-3" />
            {bookingsMenu.name}
          </div>
          {isBookingsExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        
        {isBookingsExpanded && (
          <div className="ml-6 border-l border-gray-200">
            {bookingsMenu.subItems.map((subItem) => {
              const isSubActive = location === subItem.href;
              return (
                <Link key={subItem.name} href={subItem.href} onClick={onItemClick}>
                  <div className={cn(
                    "flex items-center px-6 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
                    isSubActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
                  )}>
                    <subItem.icon className="h-4 w-4 mr-3" />
                    {subItem.name}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="px-6 py-2 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Integration</p>
      </div>
      
      {integration.map((item) => (
        <Link key={item.name} href="/settings" onClick={onItemClick}>
          <div className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all">
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </div>
        </Link>
      ))}
      
      <Link href="/settings" onClick={onItemClick}>
        <div className={cn(
          "flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all",
          location === "/settings" && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
        )}>
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </div>
      </Link>
    </nav>
  );
}

// Collapsed desktop menu component
function CollapsedDesktopMenu() {
  const [location] = useLocation();
  
  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div className={cn(
              "flex items-center justify-center py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all px-2",
              isActive && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
            )}
            title={item.name}>
              <item.icon className="h-5 w-5" />
            </div>
          </Link>
        );
      })}
      
      {integration.map((item) => (
        <Link key={item.name} href="/settings">
          <div className="flex items-center justify-center py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all px-2"
          title={item.name}>
            <item.icon className="h-5 w-5" />
          </div>
        </Link>
      ))}
      
      <Link href="/settings">
        <div className={cn(
          "flex items-center justify-center py-3 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all px-2",
          location === "/settings" && "text-gray-700 bg-blue-50 border-r-2 border-blue-600"
        )}
        title="Settings">
          <Settings className="h-5 w-5" />
        </div>
      </Link>
    </nav>
  );
}

// Mobile Menu Button component for use in page headers
export function MobileMenuButton() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-white shadow-lg"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-80 p-0 overflow-y-auto max-h-screen"
      >
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CarTaxiFront className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CabCo</h1>
              <p className="text-sm text-gray-500">Assistant</p>
            </div>
          </div>
        </div>
        
        {/* Scrollable Navigation */}
        <div className="py-4 overflow-y-auto">
          <NavigationMenu onItemClick={() => setMobileMenuOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Sidebar() {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide functionality for desktop - collapse after 10 seconds
  useEffect(() => {
    if (!isMobile && !isCollapsed) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout to collapse after 10 seconds
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 10000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isMobile, isCollapsed]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    
    // Reset timer when manually toggled
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // If expanding, start the auto-hide timer again
    if (isCollapsed && !isMobile) {
      timeoutRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 10000);
    }
  };

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button - Hidden since it will be in page headers */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-80 p-0 overflow-y-auto max-h-screen"
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CarTaxiFront className="text-white h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">CabCo</h1>
                  <p className="text-sm text-gray-500">Assistant</p>
                </div>
              </div>
            </div>
            
            {/* Scrollable Navigation */}
            <div className="py-4 overflow-y-auto">
              <NavigationMenu onItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop version
  return (
    <div className={cn(
      "bg-white shadow-lg transition-all duration-300 relative",
      isCollapsed ? "w-12" : "w-64"
    )}>
      {/* Desktop Toggle Button */}
      {isCollapsed && (
        <button
          onClick={handleToggle}
          className="absolute -right-3 top-6 bg-blue-600 text-white rounded-full p-1 shadow-lg hover:bg-blue-700 transition-colors z-10"
          title="Expand menu"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Desktop Header */}
      <div className={cn("p-6", isCollapsed && "p-2")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <CarTaxiFront className="text-white h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">CabCo</h1>
              <p className="text-sm text-gray-500">Assistant</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={handleToggle}
            className="mt-4 text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Hide menu
          </button>
        )}
      </div>
      
      {/* Desktop Navigation */}
      <div className="mt-6">
        {!isCollapsed && <NavigationMenu />}
        
        {/* Collapsed desktop icons */}
        {isCollapsed && <CollapsedDesktopMenu />}
      </div>
    </div>
  );
}
