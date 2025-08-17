import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Car, Users, MessageSquare, Phone, MapPin, Settings, User, LogOut, GripVertical } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export default function AutocabBooking() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Status Bar */}
      <div className="bg-white h-[40px] flex items-center justify-between px-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
            <Car className="w-3 h-3 mr-1" />
            <span className="font-bold">5</span>
          </div>
          <div className="flex items-center bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
            <Clock className="w-3 h-3 mr-1" />
            <span className="font-bold">2</span>
          </div>
          <div className="flex items-center bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
            <Users className="w-3 h-3 mr-1" />
            <span className="font-bold">1</span>
          </div>
          <div className="flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
            <Car className="w-3 h-3 mr-1" />
            <span className="font-bold">8</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-8">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <Phone className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">Operator</span>
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={30} maxSize={60} className="bg-white border-r">
          {/* AUTOCAB Booking Form - Exact Layout */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-gray-100 px-2 py-1 border-b">
              <h2 className="text-sm font-bold text-gray-700">New Booking</h2>
            </div>
            
            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Pickup Time */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Pickup Time</Label>
                <Input 
                  placeholder="Tuesday"
                  className="h-5 text-xs"
                  defaultValue="Tuesday"
                />
                <Input 
                  type="date"
                  className="h-5 text-xs"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
                <Input 
                  type="time"
                  className="h-5 text-xs"
                  defaultValue={new Date().toTimeString().slice(0,5)}
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Calendar className="h-3 w-3" />
                </Button>
              </div>

              {/* Pickup */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Pickup</Label>
                <Input 
                  placeholder="Canterbury, UK"
                  className="h-5 text-xs col-span-2"
                />
                <Input placeholder="Note" className="h-5 text-xs" />
                <div className="flex gap-1">
                  <Input placeholder="TOP" className="h-5 text-xs flex-1" />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <MapPin className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Via */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Via</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-2"
                />
                <Input placeholder="Note" className="h-5 text-xs" />
                <div className="flex gap-1">
                  <Input placeholder="" className="h-5 text-xs flex-1" />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <MapPin className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Destination */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Destination</Label>
                <Input 
                  placeholder="Margate, UK"
                  className="h-5 text-xs col-span-2"
                />
                <Input placeholder="Note" className="h-5 text-xs" />
                <div className="flex gap-1">
                  <Input placeholder="MARG" className="h-5 text-xs flex-1" />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <MapPin className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Name</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Company */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Company</Label>
                <Input 
                  placeholder="Cab & Co Canterbury"
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Driver Note */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Driver Note</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Telephone */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Telephone</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Phone className="h-3 w-3" />
                </Button>
              </div>

              {/* Capabilities */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Capabilities</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Passengers */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Passengers</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Requested Vehicles */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Requested Vehicles</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Requested Drivers */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Requested Drivers</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Account */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Account</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Your Reference */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Your Reference</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Our Reference */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Our Reference</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Priority */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Priority</Label>
                <Input 
                  placeholder="0"
                  className="h-5 text-xs col-span-4"
                  defaultValue="0"
                />
              </div>

              {/* Return Time */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Return Time</Label>
                <div className="col-span-4 flex gap-1 items-center">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs">
                    ✗
                  </Button>
                  <Input placeholder="-----" className="h-5 text-xs w-12" />
                  <span className="text-xs">-- / -- / ----</span>
                  <Input placeholder="--" className="h-5 text-xs w-8" />
                  <span className="text-xs">:</span>
                  <Input placeholder="--" className="h-5 text-xs w-8" />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <Calendar className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Return Flight Info */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Return Flight Info</Label>
                <div className="col-span-4 grid grid-cols-3 gap-1">
                  <Input placeholder="" className="h-5 text-xs" />
                  <Input placeholder="" className="h-5 text-xs" />
                  <Input placeholder="" className="h-5 text-xs" />
                </div>
              </div>

              {/* Luggage */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Luggage</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Repeat Days */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Repeat Days</Label>
                <div className="col-span-4 flex gap-1 flex-wrap">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Fortnightly'].map((day) => (
                    <Button 
                      key={day}
                      variant="outline" 
                      size="sm" 
                      className="h-5 px-1 text-xs"
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Repeat End Time */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Repeat End Time</Label>
                <div className="col-span-4 flex gap-1 items-center">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs">
                    ✗
                  </Button>
                  <Input placeholder="-----" className="h-5 text-xs w-12" />
                  <span className="text-xs">-- / -- / ----</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <Calendar className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Booking Suspension Group */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Booking Suspension Group</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-3"
                />
                <Button variant="ghost" size="sm" className="h-5 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>

              {/* Flight Info */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Flight Info</Label>
                <div className="col-span-4 grid grid-cols-3 gap-1">
                  <Input placeholder="" className="h-5 text-xs" />
                  <Input placeholder="" className="h-5 text-xs" />
                  <Input placeholder="" className="h-5 text-xs" />
                </div>
              </div>

              {/* Office Note */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Office Note</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Loyalty Card */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Loyalty Card</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Customer Email */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Customer Email</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>

              {/* Release Code */}
              <div className="grid grid-cols-5 gap-1 items-center">
                <Label className="text-xs font-medium text-gray-700 text-right">Release Code</Label>
                <Input 
                  placeholder=""
                  className="h-5 text-xs col-span-4"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="bg-gray-100 px-2 py-2 border-t">
              <div className="text-xs font-bold text-gray-700 mb-2">No CU Statistics Available</div>
              <div className="flex gap-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white text-xs h-6 px-3">
                  Book
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white text-xs h-6 px-3">
                  Book and Hold
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60} className="flex flex-col">
          {/* Map Area */}
          <div className="flex-1 bg-gray-200 relative">
            <div className="absolute inset-4 bg-gray-300 rounded flex items-center justify-center">
              <div className="text-center text-gray-600">
                <MapPin className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg font-medium">Map View</p>
                <p className="text-sm">Route visualization will appear here</p>
              </div>
            </div>
          </div>

          {/* Vehicle Status Panels */}
          <div className="h-48 bg-white border-t grid grid-cols-3 gap-4 p-4">
            {/* Available Vehicles */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-green-700">AVAILABLE (5)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 text-xs">
                  <div className="p-2 bg-green-50 rounded flex justify-between">
                    <span className="font-medium">Car 101</span>
                    <Badge variant="secondary" className="text-xs">Clear</Badge>
                  </div>
                  <div className="p-2 bg-green-50 rounded flex justify-between">
                    <span className="font-medium">Car 102</span>
                    <Badge variant="secondary" className="text-xs">Clear</Badge>
                  </div>
                  <div className="p-2 bg-green-50 rounded flex justify-between">
                    <span className="font-medium">Car 103</span>
                    <Badge variant="secondary" className="text-xs">Clear</Badge>
                  </div>
                  <div className="p-2 bg-green-50 rounded flex justify-between">
                    <span className="font-medium">Car 104</span>
                    <Badge variant="secondary" className="text-xs">Clear</Badge>
                  </div>
                  <div className="p-2 bg-green-50 rounded flex justify-between">
                    <span className="font-medium">Car 105</span>
                    <Badge variant="secondary" className="text-xs">Clear</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Busy Vehicles */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-orange-700">BUSY (2)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 text-xs">
                  <div className="p-2 bg-orange-50 rounded flex justify-between">
                    <span className="font-medium">Car 201</span>
                    <Badge variant="destructive" className="text-xs">On Job</Badge>
                  </div>
                  <div className="p-2 bg-orange-50 rounded flex justify-between">
                    <span className="font-medium">Car 202</span>
                    <Badge variant="destructive" className="text-xs">Picking Up</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unavailable Vehicles */}
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-700">UNAVAILABLE (1)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 text-xs">
                  <div className="p-2 bg-gray-50 rounded flex justify-between">
                    <span className="font-medium">Car 301</span>
                    <Badge variant="outline" className="text-xs">Off Duty</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom Status Bar */}
      <div className="h-[30px] bg-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>Esc Close</span>
          <span>End Book</span>
          <span>Home Book and Hold</span>
          <span>Insert Price</span>
          <span>F1 CU Options</span>
          <span>F3 Copy</span>
          <span>F4 Paste</span>
          <span>F5 Copies</span>
          <span>F6 Previous Booking</span>
          <span>F7 Job Templates</span>
          <span>F8 Recent Values</span>
          <span>F10 Card Payment</span>
          <span>Ctrl+F5</span>
        </div>
        <div className="font-mono font-bold">
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}