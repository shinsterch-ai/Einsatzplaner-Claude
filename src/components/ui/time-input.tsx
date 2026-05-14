import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(value || '');

    // Sync with external value changes
    React.useEffect(() => {
      setLocalValue(value || '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Remove non-numeric and non-colon characters
      newValue = newValue.replace(/[^\d:]/g, '');
      
      // Auto-format as user types
      if (newValue.length === 2 && !newValue.includes(':') && localValue.length < 2) {
        newValue = newValue + ':';
      }
      
      // Limit length
      if (newValue.length > 5) {
        newValue = newValue.slice(0, 5);
      }
      
      setLocalValue(newValue);
    };

    const handleBlur = () => {
      // Validate and format on blur
      const formatted = formatTime(localValue);
      setLocalValue(formatted);
      onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([8, 46, 9, 27, 13].includes(e.keyCode)) {
        return;
      }
      
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
        return;
      }
      
      // Allow: home, end, left, right, up, down
      if ([35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
        return;
      }
      
      // Allow: colon
      if (e.key === ':') {
        return;
      }
      
      // Block non-numeric input
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="08:00"
        className={cn('font-mono', className)}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        maxLength={5}
        {...props}
      />
    );
  }
);

TimeInput.displayName = 'TimeInput';

function formatTime(input: string): string {
  // Remove all non-digits
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return '08:00';
  }
  
  let hours = 0;
  let minutes = 0;
  
  if (digits.length <= 2) {
    hours = parseInt(digits, 10);
    minutes = 0;
  } else if (digits.length === 3) {
    hours = parseInt(digits[0], 10);
    minutes = parseInt(digits.slice(1), 10);
  } else {
    hours = parseInt(digits.slice(0, 2), 10);
    minutes = parseInt(digits.slice(2, 4), 10);
  }
  
  // Clamp values
  hours = Math.max(0, Math.min(23, hours));
  minutes = Math.max(0, Math.min(59, minutes));
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export { TimeInput };
