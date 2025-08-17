import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter, Edit2, ChevronLeft, ChevronRight, Trash2, Eye, MoreVertical } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: number;
  jobNumber: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  customerName: string;
  customerPhone: string;
  status: string;
  price: number;
  vehicle: string;
  passengers: number;
  luggage: number;
  driverNotes: string;
  customerAccount: string;
}

interface Column {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  resizable: boolean;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  job: Job | null;
}

export default function Bookings() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAllBookings, setShowAllBookings] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ show: false, x: 0, y: 0, job: null });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default column configuration - removed Req columns, added Distance and Booking ID
  const defaultColumns: Column[] = [
    { key: 'jobNumber', label: 'Job Reference', width: 120, minWidth: 40, resizable: true },
    { key: 'status', label: 'Status', width: 100, minWidth: 30, resizable: true },
    { key: 'time', label: 'Pickup Time', width: 90, minWidth: 35, resizable: true },
    { key: 'price', label: 'Cost', width: 80, minWidth: 30, resizable: true },
    { key: 'price2', label: 'Price', width: 80, minWidth: 30, resizable: true },
    { key: 'distance', label: 'Distance', width: 100, minWidth: 35, resizable: true },
    { key: 'passengers', label: 'Pax', width: 80, minWidth: 30, resizable: true },
    { key: 'driverNotes', label: 'Driver Note', width: 120, minWidth: 40, resizable: true },
    { key: 'ourRef', label: 'Our Ref', width: 100, minWidth: 35, resizable: true },
    { key: 'booked', label: 'Booked', width: 80, minWidth: 30, resizable: true },
    { key: 'customerAccount', label: 'Account', width: 100, minWidth: 35, resizable: true },
    { key: 'customerName', label: 'Customer', width: 120, minWidth: 40, resizable: true },
    { key: 'customerPhone', label: 'Return', width: 100, minWidth: 35, resizable: true },
    { key: 'bookingId', label: 'Booking ID', width: 100, minWidth: 40, resizable: true },
  ];

  // Load saved column configuration from localStorage
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const saved = localStorage.getItem('bookings-table-columns');
      if (saved) {
        const savedColumns = JSON.parse(saved);
        // Merge with defaults to ensure new columns are added
        return defaultColumns.map(defaultCol => {
          const savedCol = savedColumns.find((col: Column) => col.key === defaultCol.key);
          return savedCol ? { ...defaultCol, width: savedCol.width } : defaultCol;
        });
      }
    } catch (error) {
      console.warn('Failed to load saved column configuration:', error);
    }
    return defaultColumns;
  });

  // Format date for display (e.g., "Friday 09 / 01 / 2025")
  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${day} / ${month} / ${year}`;
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const currentDate = selectedDate ? new Date(selectedDate) : new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    setShowAllBookings(false);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const currentDate = selectedDate ? new Date(selectedDate) : new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    setShowAllBookings(false);
  };

  // Go to today
  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setShowAllBookings(false);
  };

  // Toggle show all bookings
  const toggleAllBookings = () => {
    if (showAllBookings) {
      // Switch to today's date filter
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setShowAllBookings(false);
    } else {
      // Switch back to all bookings
      setSelectedDate(null);
      setShowAllBookings(true);
    }
  };

  // Context menu handlers
  const handleRightClick = (event: React.MouseEvent, job: Job) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      job
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu({ show: false, x: 0, y: 0, job: null });
  };

  // Save column configuration to localStorage whenever columns change
  useEffect(() => {
    try {
      localStorage.setItem('bookings-table-columns', JSON.stringify(columns));
    } catch (error) {
      console.warn('Failed to save column configuration:', error);
    }
  }, [columns]);

  // Column management handlers
  const handleColumnResize = (columnId: string, newWidth: number) => {
    setColumns(prev => prev.map((col, index) => 
      `${col.key}-${index}` === columnId ? { ...col, width: Math.max(newWidth, col.minWidth) } : col
    ));
  };

  const handleColumnDrop = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    
    setColumns(prev => {
      const draggedIndex = prev.findIndex((col, index) => `${col.key}-${index}` === draggedId);
      const targetIndex = prev.findIndex((col, index) => `${col.key}-${index}` === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newColumns = [...prev];
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);
      
      return newColumns;
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.show) {
        handleContextMenuClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.show]);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['/api/jobs'],
  });

  const filteredJobs = (jobs as Job[])
    .filter((job: Job) => {
      const matchesSearch = !searchTerm || 
        job.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.pickup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.destination?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Only filter by date when a specific date is selected (not showing all bookings)
      const matchesDate = showAllBookings || !selectedDate || job.date === selectedDate;
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Sort by ID in descending order (most recent bookings have higher IDs)
      return b.id - a.id;
    });

  const handleJobDoubleClick = (job: Job) => {
    setLocation(`/bot-advanced/${job.id}`);
  };

  const handleEditJob = (job: Job, event: React.MouseEvent) => {
    event.stopPropagation();
    setLocation(`/bot-advanced/${job.id}`);
  };

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete job');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Job Deleted",
        description: "Booking has been removed from both local database and Autocab",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    },
  });

  const handleDeleteJob = (job: Job, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Are you sure you want to delete booking ${job.jobNumber}? This will remove it from both the local database and Autocab.`)) {
      deleteJobMutation.mutate(job.id);
    }
  };

  // Helper function to get column value based on key
  const getColumnValue = (job: any, key: string): string => {
    switch (key) {
      case 'jobNumber': return job.jobNumber || '';
      case 'status': return job.sentToAutocab ? 'SENT' : 'PENDING';
      case 'time': return job.time || '';
      case 'price': 
      case 'price2': return `£${job.price || 0}`;
      case 'distance': return job.distance || 'N/A';
      case 'passengers': return job.passengers?.toString() || '1';
      case 'driverNotes': return job.vehicleType ? `Vehicle type: ${job.vehicleType.slice(0,3)}` : 'Vehicle type: Sal';
      case 'ourRef': return 'CabCo';
      case 'booked': return 'SGH';
      case 'customerAccount': return 'SGH-SAGA';
      case 'customerName': return job.customerName?.split(',')[0] || 'Unknown';
      case 'customerPhone': return `07${job.id.toString().padStart(3, '0')}`;
      case 'bookingId': return job.autocabBookingId || job.jobNumber || '';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shadow-lg relative z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">Bookings</h1>
          <div className="flex items-center space-x-2 text-sm opacity-90">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousDay}
              className="h-6 w-6 p-0 text-blue-100 hover:text-white hover:bg-blue-600"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span 
              className="cursor-pointer hover:text-white px-2"
              onClick={goToToday}
              title="Click to go to today"
            >
              {selectedDate ? formatDateForDisplay(selectedDate) : "All Bookings"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextDay}
              className="h-6 w-6 p-0 text-blue-100 hover:text-white hover:bg-blue-600"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <input
              type="date"
              value={selectedDate || ""}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setShowAllBookings(false); // Disable all bookings when date changes
              }}
              className="bg-transparent text-blue-100 text-xs border-none outline-none cursor-pointer hover:text-white w-24 h-6"
            />
            <Calendar className="h-4 w-4 pointer-events-none" />
          </div>
          <Button
            variant={showAllBookings ? "secondary" : "outline"}
            size="sm"
            onClick={toggleAllBookings}
            className={`ml-4 text-xs px-3 py-1 h-6 ${
              showAllBookings 
                ? "bg-white text-blue-900 hover:bg-gray-100" 
                : "border-blue-200 text-blue-100 hover:bg-blue-800 hover:text-white"
            }`}
          >
            ALL BOOKINGS
          </Button>
        </div>
      </div>

      {/* Resizable/Draggable Table Header */}
      <div ref={tableRef} className="flex bg-gray-200 border-b text-xs font-medium text-gray-700 select-none">
        {columns.map((column, index) => (
          <div
            key={`${column.key}-${index}`}
            className="relative border-r border-gray-300 last:border-r-0 flex items-center"
            style={{ width: column.width, minWidth: column.minWidth }}
            draggable
            onDragStart={() => setDraggedColumn(`${column.key}-${index}`)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedColumn && draggedColumn !== `${column.key}-${index}`) {
                handleColumnDrop(draggedColumn, `${column.key}-${index}`);
              }
              setDraggedColumn(null);
            }}
          >
            <div className="px-2 py-2 truncate cursor-move flex-1">
              {column.label}
            </div>
            {column.resizable && (
              <div
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-gray-400 opacity-0 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizingColumn(`${column.key}-${index}`);
                  const startX = e.clientX;
                  const startWidth = column.width;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = Math.max(
                      column.minWidth,
                      startWidth + (e.clientX - startX)
                    );
                    handleColumnResize(`${column.key}-${index}`, newWidth);
                  };

                  const handleMouseUp = () => {
                    setResizingColumn(null);
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Table Body - Resizable/Draggable */}
      <div className="flex-1 overflow-auto">
        {filteredJobs.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No bookings found for the selected criteria
          </div>
        ) : (
          <div>
            {filteredJobs.map((job: Job) => (
              <div
                key={job.id}
                className="border-b border-gray-200 flex text-xs hover:bg-blue-50 cursor-pointer transition-colors"
                onDoubleClick={() => handleJobDoubleClick(job)}
                onContextMenu={(e) => handleRightClick(e, job)}
              >
                {columns.map((column, index) => (
                  <div
                    key={`${column.key}-${index}`}
                    className="border-r border-gray-100 last:border-r-0 px-2 py-2 truncate"
                    style={{ width: column.width, minWidth: column.minWidth }}
                    title={getColumnValue(job, column.key)}
                  >
                    {getColumnValue(job, column.key)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && contextMenu.job && (
        <div
          className="fixed bg-white border border-gray-300 rounded-md shadow-lg z-50 py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={handleContextMenuClose}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
            onClick={() => {
              setLocation(`/bot-advanced/${contextMenu.job!.id}`);
              handleContextMenuClose();
            }}
          >
            <Edit2 className="h-4 w-4 text-blue-600" />
            EDIT
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete booking ${contextMenu.job!.jobNumber}? This will remove it from both the local database and Autocab.`)) {
                deleteJobMutation.mutate(contextMenu.job!.id);
              }
              handleContextMenuClose();
            }}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            DELETE
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              handleJobDoubleClick(contextMenu.job!);
              handleContextMenuClose();
            }}
          >
            <Eye className="h-4 w-4 text-gray-600" />
            View
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-100 border-t px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <span>Edit</span>
          <span>Create</span>
          <span>Examine booking history</span>
          <span>Pull Setup</span>
          <span>Driver Filter</span>
          <span>No Reports</span>
          <span>All Skipped & Suspended</span>
          <span>Refresh</span>
          <span>New Booking</span>
          <span>Send to taxiing</span>
          <span>E Control</span>
          <span>E DIS</span>
          <span>Breakdown Control</span>
          <span>E Places</span>
          <span>AI Chat</span>
          <span>Km Damage Agreements</span>
          <span>All Booking</span>
          <span>Drivers</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>🔽</span>
          <span>👁</span>
          <span>📊</span>
          <span>🔄</span>
          <span>Online Bookings</span>
        </div>
      </div>
    </div>
  );
}