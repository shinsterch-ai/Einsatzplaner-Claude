import { useMemo, useState } from 'react';
import { Clock, CalendarOff, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, getDay, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { DayAvailability, WeekPattern } from '@/hooks/use-employees';
import { cn } from '@/lib/utils';
import { ConflictResolutionPopover, ConflictContext } from './ConflictResolutionPopover';

interface AvailabilityWarningProps {
  employeeId: string | undefined;
  employeeName: string | undefined;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  availability: DayAvailability[] | undefined;
  patientId?: string;
  patientName?: string;
  assignmentType?: string;
  onApplySolution?: (solution: { suggestedEmployeeId?: string; suggestedStartTime?: string; suggestedEndTime?: string }) => void;
}

// Convert JS day (0=Sunday) to our system (0=Monday)
function jsToAvailabilityDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Check if this week matches the pattern
function isWeekMatchingPattern(date: Date, pattern: WeekPattern): boolean {
  if (pattern === 'every') return true;
  const weekNumber = getISOWeek(date);
  const isEvenWeek = weekNumber % 2 === 0;
  return pattern === 'even' ? isEvenWeek : !isEvenWeek;
}

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: 'not_working_day' | 'outside_hours' | 'wrong_week_pattern';
  dayAvailability?: DayAvailability;
  message?: string;
}

export function checkEmployeeAvailability(
  selectedDate: Date,
  startTime: string,
  endTime: string,
  availability: DayAvailability[] | undefined
): AvailabilityCheck {
  if (!availability || availability.length === 0) {
    return { isAvailable: true }; // No availability defined = always available
  }

  const jsDay = getDay(selectedDate); // 0 = Sunday
  const availDay = jsToAvailabilityDay(jsDay);
  
  const dayAvail = availability.find(a => a.dayOfWeek === availDay);
  
  // Day not in schedule or marked as unavailable
  if (!dayAvail || !dayAvail.isAvailable) {
    const dayName = format(selectedDate, 'EEEE', { locale: de });
    return {
      isAvailable: false,
      reason: 'not_working_day',
      dayAvailability: dayAvail,
      message: `Nicht verfügbar am ${dayName}`,
    };
  }

  // Check week pattern (even/odd weeks)
  if (!isWeekMatchingPattern(selectedDate, dayAvail.weekPattern)) {
    const weekNumber = getISOWeek(selectedDate);
    const patternLabel = dayAvail.weekPattern === 'even' ? 'geraden' : 'ungeraden';
    return {
      isAvailable: false,
      reason: 'wrong_week_pattern',
      dayAvailability: dayAvail,
      message: `Nur in ${patternLabel} KW verfügbar (aktuell KW ${weekNumber})`,
    };
  }

  // Check time window
  const availStart = dayAvail.startTime;
  const availEnd = dayAvail.endTime;
  
  // Check if assignment time fits within availability window
  if (startTime < availStart || endTime > availEnd) {
    return {
      isAvailable: false,
      reason: 'outside_hours',
      dayAvailability: dayAvail,
      message: `Arbeitszeit: ${availStart.slice(0, 5)} - ${availEnd.slice(0, 5)} Uhr`,
    };
  }

  return { isAvailable: true, dayAvailability: dayAvail };
}

export function AvailabilityWarning({
  employeeId,
  employeeName,
  selectedDate,
  startTime,
  endTime,
  availability,
  patientId,
  patientName,
  assignmentType,
  onApplySolution,
}: AvailabilityWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const availabilityCheck = useMemo(() => {
    if (!employeeId || !startTime || !endTime) return null;
    return checkEmployeeAvailability(selectedDate, startTime, endTime, availability);
  }, [employeeId, selectedDate, startTime, endTime, availability]);

  // Build full availability schedule for display - must be before conditional return
  const availabilitySchedule = useMemo(() => {
    if (!availability || availability.length === 0) return null;
    return availability
      .filter(a => a.isAvailable)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map(a => ({
        day: DAY_NAMES[a.dayOfWeek],
        time: `${a.startTime.slice(0, 5)} - ${a.endTime.slice(0, 5)}`,
        pattern: a.weekPattern === 'even' ? '(gerade KW)' : a.weekPattern === 'odd' ? '(ungerade KW)' : '',
      }));
  }, [availability]);

  // Build conflict context for AI resolution
  const conflictContext: ConflictContext | null = useMemo(() => {
    if (!availabilityCheck || availabilityCheck.isAvailable) return null;
    
    return {
      type: 'availability',
      employeeId,
      employeeName,
      patientId,
      patientName,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      assignmentType,
      conflictDetails: availabilityCheck.message,
      availability: availability?.map(a => ({
        dayOfWeek: a.dayOfWeek,
        isAvailable: a.isAvailable,
        startTime: a.startTime,
        endTime: a.endTime,
        weekPattern: a.weekPattern,
      })),
    };
  }, [availabilityCheck, employeeId, employeeName, patientId, patientName, selectedDate, startTime, endTime, assignmentType, availability]);

  // Conditional return after all hooks
  if (!availabilityCheck || availabilityCheck.isAvailable) return null;

  const Icon = availabilityCheck.reason === 'not_working_day' ? CalendarOff : Clock;

  const alertContent = (
    <Alert 
      className={cn(
        "border-warning bg-warning/10 cursor-pointer transition-all hover:bg-warning/15",
        isExpanded && "pb-4"
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
    >
      <Icon className="h-4 w-4 text-warning" />
      <AlertDescription className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-warning">Verfügbarkeitskonflikt</p>
              {onApplySolution && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Sparkles className="h-3 w-3" />
                  KI-Hilfe
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>{employeeName || 'Mitarbeiter:in'}</strong> ist zu dieser Zeit nicht verfügbar.
              <br />
              {availabilityCheck.message}
            </p>
          </div>
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {isExpanded && availabilitySchedule && availabilitySchedule.length > 0 && (
          <div className="mt-3 pt-3 border-t border-warning/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Verfügbarkeit von {employeeName}:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {availabilitySchedule.map((slot, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="font-medium w-6">{slot.day}</span>
                  <span className="text-muted-foreground">{slot.time}</span>
                  {slot.pattern && <span className="text-muted-foreground/70">{slot.pattern}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );

  if (onApplySolution && conflictContext) {
    return (
      <ConflictResolutionPopover
        context={conflictContext}
        onApplySolution={(solution) => {
          onApplySolution({
            suggestedEmployeeId: solution.suggestedEmployeeId,
            suggestedStartTime: solution.suggestedStartTime,
            suggestedEndTime: solution.suggestedEndTime,
          });
        }}
      >
        {alertContent}
      </ConflictResolutionPopover>
    );
  }

  return alertContent;
}
