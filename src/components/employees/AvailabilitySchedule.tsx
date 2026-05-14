import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeInput } from '@/components/ui/time-input';
import { Clock } from 'lucide-react';

export type WeekPattern = 'every' | 'even' | 'odd';

export const WEEK_PATTERN_LABELS: Record<WeekPattern, string> = {
  every: 'Jede Woche',
  even: 'Gerade KW',
  odd: 'Ungerade KW',
};

export interface DayAvailability {
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  isAvailable: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  weekPattern: WeekPattern;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Montag', short: 'Mo' },
  { value: 1, label: 'Dienstag', short: 'Di' },
  { value: 2, label: 'Mittwoch', short: 'Mi' },
  { value: 3, label: 'Donnerstag', short: 'Do' },
  { value: 4, label: 'Freitag', short: 'Fr' },
  { value: 5, label: 'Samstag', short: 'Sa' },
  { value: 6, label: 'Sonntag', short: 'So' },
];

const DEFAULT_START = '08:00';
const DEFAULT_END = '17:00';

interface AvailabilityScheduleProps {
  value: DayAvailability[];
  onChange: (value: DayAvailability[]) => void;
}

export const AvailabilitySchedule = React.forwardRef<HTMLDivElement, AvailabilityScheduleProps>(
  ({ value, onChange }, ref) => {
    const getDay = (dayOfWeek: number): DayAvailability => {
      return value.find(d => d.dayOfWeek === dayOfWeek) || {
        dayOfWeek,
        isAvailable: false,
        startTime: DEFAULT_START,
        endTime: DEFAULT_END,
        weekPattern: 'every',
      };
    };

    const updateDay = (dayOfWeek: number, updates: Partial<DayAvailability>) => {
      const existingIndex = value.findIndex(d => d.dayOfWeek === dayOfWeek);
      const current = getDay(dayOfWeek);
      const updated = { ...current, ...updates };

      if (existingIndex >= 0) {
        const newValue = [...value];
        newValue[existingIndex] = updated;
        onChange(newValue);
      } else {
        onChange([...value, updated]);
      }
    };

    return (
      <div ref={ref} className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <Label className="text-base font-medium">Verfügbarkeit</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          An welchen Tagen und zu welchen Zeiten ist dieser Mitarbeiter verfügbar?
        </p>
        
        <div className="rounded-lg border divide-y">
          {DAYS_OF_WEEK.map((day) => {
            const dayData = getDay(day.value);
            return (
              <div 
                key={day.value} 
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="w-24 flex items-center gap-2 shrink-0">
                  <Switch
                    checked={dayData.isAvailable}
                    onCheckedChange={(checked) => updateDay(day.value, { isAvailable: checked })}
                  />
                  <span className="text-sm font-medium">{day.short}</span>
                </div>
                
                {dayData.isAvailable ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <TimeInput
                      value={dayData.startTime}
                      onChange={(val) => updateDay(day.value, { startTime: val })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">–</span>
                    <TimeInput
                      value={dayData.endTime}
                      onChange={(val) => updateDay(day.value, { endTime: val })}
                      className="w-24"
                    />
                    <Select
                      value={dayData.weekPattern}
                      onValueChange={(val) => updateDay(day.value, { weekPattern: val as WeekPattern })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(WEEK_PATTERN_LABELS) as WeekPattern[]).map((pattern) => (
                          <SelectItem key={pattern} value={pattern}>
                            {WEEK_PATTERN_LABELS[pattern]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Nicht verfügbar</span>
                )}
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground">
          💡 Wählen Sie pro Tag, ob jede Woche oder nur alle 2 Wochen (gerade/ungerade KW) gearbeitet wird.
        </p>
      </div>
    );
  }
);

AvailabilitySchedule.displayName = 'AvailabilitySchedule';

// Helper to create default availability (all weekdays 8-17, every week)
export function getDefaultAvailability(): DayAvailability[] {
  return DAYS_OF_WEEK.slice(0, 5).map(day => ({
    dayOfWeek: day.value,
    isAvailable: true,
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    weekPattern: 'every',
  }));
}
