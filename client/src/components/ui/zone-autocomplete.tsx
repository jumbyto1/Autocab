import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Zone {
  name: string;
  descriptor: string;
  id: string;
  active: boolean;
}

interface ZoneAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ZoneAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search zone...", 
  className,
  disabled = false 
}: ZoneAutocompleteProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const searchZones = async (query: string) => {
    if (query.length < 1) {
      setZones([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/zones/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setZones(data.zones || []);
      } else {
        console.error('Zone search failed:', data.message);
        setZones([]);
      }
    } catch (error) {
      console.error('Zone search error:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (value) {
      searchZones(value);
      setShowSuggestions(true);
    } else {
      setZones([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const selectZone = (zone: Zone) => {
    onChange(zone.descriptor);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      inputRef.current && 
      !inputRef.current.contains(event.target as Node) &&
      suggestionsRef.current &&
      !suggestionsRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={cn("font-bold text-center", className)}
        disabled={disabled}
      />
      
      {showSuggestions && zones.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {loading && (
            <div className="p-2 text-center text-gray-500 text-sm">
              Searching zones...
            </div>
          )}
          
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
              onClick={() => selectZone(zone)}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-700">{zone.descriptor}</span>
                <span className="text-sm text-gray-600">{zone.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}