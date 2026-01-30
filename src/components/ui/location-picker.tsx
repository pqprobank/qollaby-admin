"use client";

/**
 * Location Picker Component
 * 
 * A reusable location search component using Google Places Autocomplete API.
 * Uses vanilla Google Maps API (no external React wrapper dependency).
 */

import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { MapPin, X, Loader2, Crosshair } from 'lucide-react';

// Types
export interface PlaceValue {
  placeId: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationPickerProps {
  value?: PlaceValue | null;
  onChange: (location: PlaceValue | null) => void;
  placeholder?: string;
  label?: string;
  showCurrentLocation?: boolean;
  countryRestriction?: string;
  searchTypes?: string[];
  className?: string;
  disabled?: boolean;
}

// Google Maps Context
interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: null,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

// Load Google Maps script
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    if ((window as any).google?.maps) {
      resolve();
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

/**
 * Google Maps Provider - Wrap your app with this
 */
export const GoogleMapsProvider: React.FC<{
  apiKey: string;
  children: React.ReactNode;
}> = ({ apiKey, children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setLoadError(new Error('Google Maps API key is required'));
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => setIsLoaded(true))
      .catch((error) => setLoadError(error));
  }, [apiKey]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

// Parse address components from Google Place result
const parseAddressComponents = (
  components: google.maps.GeocoderAddressComponent[]
): { city?: string; state?: string; country?: string } => {
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  for (const component of components) {
    const types = component.types;

    if (types.includes('administrative_area_level_1')) {
      state = component.short_name; // Use short_name for state (e.g., "CA" instead of "California")
    }
    if (types.includes('locality')) {
      city = component.long_name;
    } else if (!city && types.includes('sublocality_level_1')) {
      city = component.long_name;
    } else if (!city && types.includes('administrative_area_level_3')) {
      city = component.long_name;
    }
    if (types.includes('country')) {
      country = component.long_name;
    }
  }

  return { city, state, country };
};

// Reverse geocode coordinates to address
const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<PlaceValue | null> => {
  if (!(window as any).google?.maps) {
    console.error('Google Maps not loaded');
    return null;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({
      location: { lat: latitude, lng: longitude },
    });

    if (response.results?.[0]) {
      const result = response.results[0];
      const { city, state, country } = parseAddressComponents(result.address_components);

      return {
        placeId: result.place_id,
        address: result.formatted_address,
        latitude,
        longitude,
        city,
        state,
        country,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

/**
 * Main Location Picker Component
 */
const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Search for full address...',
  label,
  showCurrentLocation = true,
  countryRestriction = 'us',
  searchTypes = ['geocode'],
  className = '',
  disabled = false,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(value?.address || '');
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasSelected, setHasSelected] = useState(!!value);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Clean up previous instance if exists
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const input = inputRef.current;
    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: countryRestriction ? { country: countryRestriction } : undefined,
      types: searchTypes,
      fields: ['place_id', 'formatted_address', 'geometry', 'address_components'],
    });

    // Initialize services for manual selection
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    // Create a dummy div for PlacesService (required but not displayed)
    const dummyDiv = document.createElement('div');
    placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);

    const handlePlaceChanged = () => {
      const place = autocomplete.getPlace();

      if (!place.geometry?.location) {
        console.warn('No geometry for place');
        return;
      }

      const { city, state, country } = place.address_components
        ? parseAddressComponents(place.address_components)
        : { city: undefined, state: undefined, country: undefined };

      const locationData: PlaceValue = {
        placeId: place.place_id || '',
        address: place.formatted_address || '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        city,
        state,
        country,
      };

      // Update the input value directly on the DOM element as well
      if (input) {
        input.value = locationData.address;
      }
      setInputValue(locationData.address);
      setHasSelected(true);
      onChange(locationData);
    };

    // Add the listener
    const listener = google.maps.event.addListener(autocomplete, 'place_changed', handlePlaceChanged);
    autocompleteRef.current = autocomplete;

    // Also handle clicks on pac-item manually as a fallback
    const handlePacItemClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const pacItem = target.closest('.pac-item');
      if (pacItem) {
        // Small delay to let Google's internal handling complete
        setTimeout(() => {
          handlePlaceChanged();
        }, 100);
      }
    };

    document.addEventListener('click', handlePacItemClick, true);

    return () => {
      google.maps.event.removeListener(listener);
      document.removeEventListener('click', handlePacItemClick, true);
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, countryRestriction, searchTypes, onChange]);

  // Select first prediction from autocomplete
  const selectFirstPrediction = useCallback(async () => {
    if (!inputValue.trim() || hasSelected || !autocompleteServiceRef.current || !placesServiceRef.current) {
      return;
    }

    try {
      // Get predictions
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteServiceRef.current!.getPlacePredictions(
          {
            input: inputValue,
            componentRestrictions: countryRestriction ? { country: countryRestriction } : undefined,
            types: searchTypes,
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error(status));
            }
          }
        );
      });

      if (predictions.length === 0) return;

      // Get place details for first prediction
      const firstPrediction = predictions[0];
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesServiceRef.current!.getDetails(
          {
            placeId: firstPrediction.place_id,
            fields: ['place_id', 'formatted_address', 'geometry', 'address_components'],
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(status));
            }
          }
        );
      });

      if (!placeDetails.geometry?.location) return;

      const { city, state, country } = placeDetails.address_components
        ? parseAddressComponents(placeDetails.address_components)
        : { city: undefined, state: undefined, country: undefined };

      const locationData: PlaceValue = {
        placeId: placeDetails.place_id || '',
        address: placeDetails.formatted_address || '',
        latitude: placeDetails.geometry.location.lat(),
        longitude: placeDetails.geometry.location.lng(),
        city,
        state,
        country,
      };

      if (inputRef.current) {
        inputRef.current.value = locationData.address;
      }
      setInputValue(locationData.address);
      setHasSelected(true);
      onChange(locationData);
    } catch (error) {
      console.warn('Could not auto-select prediction:', error);
    }
  }, [inputValue, hasSelected, countryRestriction, searchTypes, onChange]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Small delay to let Google's internal handling complete first
      setTimeout(() => {
        if (!hasSelected && inputValue.trim()) {
          selectFirstPrediction();
        }
      }, 200);
    }
  };

  // Handle blur - auto select on focus out
  const handleBlur = () => {
    // Delay to allow click on pac-item to process first
    setTimeout(() => {
      if (!hasSelected && inputValue.trim()) {
        selectFirstPrediction();
      }
    }, 300);
  };

  // Update input value when external value changes
  useEffect(() => {
    if (value?.address !== undefined) {
      setInputValue(value.address);
    }
  }, [value?.address]);

  // Detect current location
  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const location = await reverseGeocode(latitude, longitude);

      if (location) {
        setInputValue(location.address);
        onChange(location);
      } else {
        alert('Could not get address for your location');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      alert(
        error.code === 1
          ? 'Location permission denied. Please enable location access.'
          : 'Failed to detect location. Please try again.'
      );
    } finally {
      setIsDetecting(false);
    }
  }, [onChange]);

  // Clear location
  const handleClear = () => {
    setInputValue('');
    setHasSelected(false);
    onChange(null);
  };

  if (loadError) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && <label className="text-sm font-medium text-destructive">{label}</label>}
        <div className="text-sm text-destructive">
          Failed to load Google Maps. Please check your API key.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setHasSelected(false); // Reset selection state when user types
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={isLoaded ? placeholder : 'Loading...'}
          disabled={disabled || !isLoaded}
          className="w-full h-9 pl-10 pr-20 rounded-md bg-input/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Current location button */}
          {showCurrentLocation && isLoaded && (
            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={isDetecting || disabled}
              className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Use current location"
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Clear button */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Use current location link */}
      {showCurrentLocation && isLoaded && (
        <button
          type="button"
          onClick={detectCurrentLocation}
          disabled={isDetecting || disabled}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDetecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4" />
              Use Current Location
            </>
          )}
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Search for a full address including street number
      </p>
    </div>
  );
};

export default LocationPicker;
