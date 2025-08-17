import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

interface AddressAutocompleteProps {
  value: string;
  onSelect?: (result: { address: string; coordinates?: { lat: number; lng: number } | null }) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  userLocation?: { lat: number; lng: number } | null;
}

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  types?: string[];
}

export function AddressAutocomplete({ 
  value, 
  onSelect,
  onChange, 
  placeholder = "Enter address...", 
  className,
  icon,
  userLocation
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  
  // Sync inputValue with value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Debounce search query
  const debouncedQuery = useDebounce(inputValue, 300);

  // Fetch address suggestions using backend API
  useEffect(() => {
    if (!debouncedQuery || typeof debouncedQuery !== 'string' || debouncedQuery.trim().length < 3) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    // Don't fetch if user just selected something to prevent reopening
    if (justSelected) {
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      console.log('🔍 Searching address suggestions for:', debouncedQuery);

      try {
        // Build URL with user location for priority bias
        let url = `/api/places/autocomplete?input=${encodeURIComponent(debouncedQuery)}`;
        if (userLocation) {
          url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
          console.log('📍 Sending user location for prioritized search:', userLocation);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('📍 Address suggestions response:', { success: data.success, resultsCount: data.predictions?.length || 0 });
        
        if (data.success && data.predictions) {
          console.log('✅ Found addresses:', data.predictions.map((p: PlacePrediction) => p.description));
          
          setPredictions(data.predictions.slice(0, 8)); // Show max 8 suggestions like Autocab
          setShowSuggestions(true);
          console.log('🎯 Showing suggestions:', data.predictions.slice(0, 8).map((p: PlacePrediction) => p.description));
        } else {
          console.log('❌ No results or error:', data.error);
          setPredictions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('❌ Error fetching suggestions:', error);
        setPredictions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call onChange if provided (for typing)
    if (typeof onChange === 'function') {
      onChange(newValue);
    }
    
    // Reset selection flag when user types
    setJustSelected(false);
    
    // Show suggestions when user starts typing (if we have predictions and enough characters)
    if (predictions.length > 0 && newValue.length >= 3 && !justSelected) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = async (prediction: PlacePrediction) => {
    console.log('🎯 Selected suggestion:', prediction.description);
    setInputValue(prediction.description);
    
    // Fetch coordinates for the selected address
    try {
      const response = await fetch(`/api/places/geocode?placeId=${prediction.place_id}`);
      const data = await response.json();
      
      console.log('📍 Geocoding response for', prediction.description, ':', data);
      
      if (data.success && data.coordinates) {
        // Call onSelect with address and coordinates
        if (typeof onSelect === 'function') {
          onSelect({
            address: prediction.description,
            coordinates: data.coordinates
          });
        }
      } else {
        console.error('❌ Failed to get coordinates for selected address');
        // Still call onSelect with just the address
        if (typeof onSelect === 'function') {
          onSelect({
            address: prediction.description,
            coordinates: null
          });
        }
      }
    } catch (error) {
      console.error('❌ Error geocoding selected address:', error);
      // Still call onSelect with just the address
      if (typeof onSelect === 'function') {
        onSelect({
          address: prediction.description,
          coordinates: null
        });
      }
    }
    
    // Mark as just selected to prevent immediate reopening
    setJustSelected(true);
    
    // Immediately close suggestions like AUTOCAB
    setShowSuggestions(false);
    setPredictions([]);
    setIsLoading(false);
    
    // Blur the input to prevent immediate refocus and reopening
    setTimeout(() => {
      if (document.activeElement instanceof HTMLInputElement) {
        document.activeElement.blur();
      }
    }, 10);
    
    // Reset the flag after a delay
    setTimeout(() => {
      setJustSelected(false);
    }, 1000);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleInputFocus = () => {
    // Don't show suggestions on focus - only show when user starts typing
    // This prevents suggestions appearing when editing existing addresses
  };

  // Highlight matching text like Autocab
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  };

  return (
    <div className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            {icon}
          </div>
        )}
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={className}
        />
      </div>
      
      {showSuggestions && predictions.length > 0 && (
        <div className="address-autocomplete-dropdown dark:bg-gray-800 dark:border-gray-600">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Searching Canterbury area...
            </div>
          )}
          {predictions.map((prediction, index) => {
            const isCanterbury = prediction.description.toLowerCase().includes('canterbury');
            const isEstablishment = prediction.types?.includes('establishment');
            
            return (
              <div
                key={prediction.place_id}
                onClick={() => handleSuggestionClick(prediction)}
                className={`px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b last:border-b-0 ${
                  isCanterbury ? 'bg-green-50 dark:bg-green-900/10' : ''
                }`}
              >
                <div className="flex flex-col">
                  <div 
                    className={`font-medium text-sm ${isCanterbury ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}
                    dangerouslySetInnerHTML={{
                      __html: highlightMatch(
                        prediction.structured_formatting?.main_text || prediction.description,
                        debouncedQuery
                      )
                    }}
                  />
                  {prediction.structured_formatting?.secondary_text && (
                    <div className={`text-xs mt-0.5 ${isCanterbury ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {prediction.structured_formatting.secondary_text}
                      {isCanterbury && <span className="ml-2 text-green-600 font-medium">Canterbury</span>}
                      {isEstablishment && <span className="ml-2 text-blue-600 text-xs">📍</span>}
                    </div>
                  )}
                  {isCanterbury && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        📍 Canterbury
                      </span>
                    </div>
                  )}
                  {isEstablishment && !isCanterbury && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        🏢 Establishment
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}