import { useEffect, useRef, useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: {
    address: string;
    city: string;
    postalCode?: string;
    country?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Suppress Google Maps auth failure overlay
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.warn('Google Maps authentication failed - autocomplete will fall back to manual input');
    isScriptFailed = true;
    // Remove any error overlays Google injects
    setTimeout(() => {
      document.querySelectorAll('.dismissButton, .gm-err-container, .gm-err-autocomplete').forEach(el => el.remove());
    }, 100);
  };
}

let isScriptLoading = false;
let isScriptLoaded = false;
let isScriptFailed = false;
const callbacks: ((success: boolean) => void)[] = [];

function loadGoogleMapsScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isScriptFailed) {
      resolve(false);
      return;
    }
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve(true);
      return;
    }

    callbacks.push(resolve);

    if (isScriptLoading) {
      return;
    }

    isScriptLoading = true;

    window.initGoogleMaps = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      callbacks.forEach((cb) => cb(true));
      callbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      isScriptFailed = true;
      isScriptLoading = false;
      console.warn('Google Maps script failed to load');
      callbacks.forEach((cb) => cb(false));
      callbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete({
    value,
    onChange,
    onPlaceSelect,
    placeholder = 'Adresse eingeben...',
    className,
    disabled,
  }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  
  // Store callbacks in refs to avoid stale closures
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  // Sync external value changes to internal state
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setIsLoaded(false);
      return;
    }
    loadGoogleMapsScript().then((success) => {
      setIsLoaded(success);
    });
  }, []);

  // Fix: Google Maps pac-container needs higher z-index to work in dialogs
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'pac-container-style';
    style.textContent = `
      .pac-container {
        z-index: 10000 !important;
        pointer-events: auto !important;
      }
      .gm-err-container, .gm-err-autocomplete {
        display: none !important;
      }
    `;
    
    // Only add if not already present
    if (!document.getElementById('pac-container-style')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('pac-container-style');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    
    // Clean up previous autocomplete if it exists
    if (autocompleteRef.current) {
      window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'ch' }, // Restrict to Switzerland
      fields: ['address_components', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.address_components) {
        console.warn('No address components in place:', place);
        return;
      }

      let streetNumber = '';
      let route = '';
      let city = '';
      let postalCode = '';
      let country = '';

      for (const component of place.address_components) {
        const type = component.types[0];
        switch (type) {
          case 'street_number':
            streetNumber = component.long_name;
            break;
          case 'route':
            route = component.long_name;
            break;
          case 'locality':
            city = component.long_name;
            break;
          case 'postal_code':
            postalCode = component.long_name;
            break;
          case 'country':
            country = component.long_name;
            break;
        }
      }

      const address = streetNumber ? `${route} ${streetNumber}` : route;
      const fullAddress = place.formatted_address || address;

      // Update internal state first
      setInternalValue(fullAddress);
      
      // Use refs to avoid stale closures
      onChangeRef.current(fullAddress);
      
      if (onPlaceSelectRef.current) {
        onPlaceSelectRef.current({
          address: fullAddress,
          city,
          postalCode,
          country,
        });
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={internalValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={cn(className)}
      disabled={disabled}
    />
  );
});

AddressAutocomplete.displayName = 'AddressAutocomplete';
