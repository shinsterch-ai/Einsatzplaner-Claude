import { useState, useEffect, useMemo } from 'react';
import { Car, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { Assignment } from '@/types';

interface TravelTimeWarningProps {
  selectedEmployeeId: string | undefined;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  patientAddress: string | undefined;
  existingAssignments: Assignment[];
  currentAssignmentId?: string;
  onConflictChange?: (hasConflict: boolean) => void;
}

interface TravelTimeInfo {
  previousAssignment: Assignment | null;
  nextAssignment: Assignment | null;
  previousTravelMinutes: number | null;
  nextTravelMinutes: number | null;
  previousGapMinutes: number;
  nextGapMinutes: number;
  previousConflict: boolean;
  nextConflict: boolean;
  loading: boolean;
  error: string | null;
}

// Parse time string to minutes since midnight
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format minutes as HH:MM
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function TravelTimeWarning({
  selectedEmployeeId,
  selectedDate,
  startTime,
  endTime,
  patientAddress,
  existingAssignments,
  currentAssignmentId,
  onConflictChange,
}: TravelTimeWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelTimeInfo>({
    previousAssignment: null,
    nextAssignment: null,
    previousTravelMinutes: null,
    nextTravelMinutes: null,
    previousGapMinutes: 0,
    nextGapMinutes: 0,
    previousConflict: false,
    nextConflict: false,
    loading: false,
    error: null,
  });

  // Find adjacent assignments for the employee on the selected date
  const adjacentAssignments = useMemo(() => {
    if (!selectedEmployeeId || !startTime || !endTime) {
      return { previous: null, next: null };
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const employeeAssignments = existingAssignments
      .filter(a => {
        const assignmentDate = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
        return (
          a.assignedEmployeeId === selectedEmployeeId && 
          assignmentDate === dateStr &&
          a.id !== currentAssignmentId &&
          a.status !== 'cancelled'
        );
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentStartMinutes = parseTimeToMinutes(startTime);
    const currentEndMinutes = parseTimeToMinutes(endTime);

    // Find the assignment that ends right before this one starts
    const previous = employeeAssignments
      .filter(a => parseTimeToMinutes(a.endTime) <= currentStartMinutes)
      .pop() || null;

    // Find the assignment that starts right after this one ends
    const next = employeeAssignments
      .find(a => parseTimeToMinutes(a.startTime) >= currentEndMinutes) || null;

    return { previous, next };
  }, [selectedEmployeeId, selectedDate, startTime, endTime, existingAssignments, currentAssignmentId]);

  // Calculate travel times via edge function
  useEffect(() => {
    const calculateTravelTimes = async () => {
      const { previous, next } = adjacentAssignments;
      
      if ((!previous && !next) || !patientAddress) {
        setTravelInfo(prev => ({
          ...prev,
          previousAssignment: previous,
          nextAssignment: next,
          previousTravelMinutes: null,
          nextTravelMinutes: null,
          previousConflict: false,
          nextConflict: false,
          loading: false,
          error: null,
        }));
        onConflictChange?.(false);
        return;
      }

      setTravelInfo(prev => ({ ...prev, loading: true, error: null }));

      try {
        let previousTravelMinutes: number | null = null;
        let nextTravelMinutes: number | null = null;
        let previousGapMinutes = 0;
        let nextGapMinutes = 0;

        const currentStartMinutes = parseTimeToMinutes(startTime);
        const currentEndMinutes = parseTimeToMinutes(endTime);

        // Calculate gap and travel time from previous assignment
        if (previous && previous.patientAddress) {
          previousGapMinutes = currentStartMinutes - parseTimeToMinutes(previous.endTime);
          
          const { data, error } = await supabase.functions.invoke('calculate-travel-time', {
            body: {
              originAddress: previous.patientAddress,
              destinationAddress: patientAddress,
            },
          });

          if (!error && data) {
            previousTravelMinutes = data.travelTimeMinutes;
          }
        }

        // Calculate gap and travel time to next assignment
        if (next && next.patientAddress) {
          nextGapMinutes = parseTimeToMinutes(next.startTime) - currentEndMinutes;
          
          const { data, error } = await supabase.functions.invoke('calculate-travel-time', {
            body: {
              originAddress: patientAddress,
              destinationAddress: next.patientAddress,
            },
          });

          if (!error && data) {
            nextTravelMinutes = data.travelTimeMinutes;
          }
        }

        // Determine if there are conflicts (not enough time for travel)
        const previousConflict = previousTravelMinutes !== null && previousGapMinutes < previousTravelMinutes;
        const nextConflict = nextTravelMinutes !== null && nextGapMinutes < nextTravelMinutes;

        setTravelInfo({
          previousAssignment: previous,
          nextAssignment: next,
          previousTravelMinutes,
          nextTravelMinutes,
          previousGapMinutes,
          nextGapMinutes,
          previousConflict,
          nextConflict,
          loading: false,
          error: null,
        });

        onConflictChange?.(previousConflict || nextConflict);

      } catch (error) {
        console.error('Error calculating travel times:', error);
        setTravelInfo(prev => ({
          ...prev,
          loading: false,
          error: 'Fehler bei der Fahrzeitberechnung',
        }));
        onConflictChange?.(false);
      }
    };

    const debounceTimer = setTimeout(calculateTravelTimes, 500);
    return () => clearTimeout(debounceTimer);
  }, [adjacentAssignments, patientAddress, startTime, endTime, onConflictChange]);

  const hasConflict = travelInfo.previousConflict || travelInfo.nextConflict;
  const hasTravelInfo = travelInfo.previousTravelMinutes !== null || travelInfo.nextTravelMinutes !== null;

  // Don't show anything if no employee selected or no adjacent assignments
  if (!selectedEmployeeId || (!adjacentAssignments.previous && !adjacentAssignments.next)) {
    return null;
  }

  // Show loading state
  if (travelInfo.loading) {
    return (
      <Alert className="border-muted bg-muted/10">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <AlertDescription>
          <p className="text-sm text-muted-foreground">Fahrzeiten werden berechnet...</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show if no travel info available (missing addresses)
  if (!hasTravelInfo && !travelInfo.error) {
    return null;
  }

  return (
    <Alert 
      className={cn(
        "cursor-pointer transition-all",
        hasConflict 
          ? "border-destructive bg-destructive/10 hover:bg-destructive/15" 
          : "border-muted bg-muted/10 hover:bg-muted/15",
        isExpanded && "pb-4"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {hasConflict ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : (
        <Car className="h-4 w-4 text-muted-foreground" />
      )}
      <AlertDescription className="w-full">
        <div className="flex items-center justify-between">
          <div>
            {hasConflict ? (
              <>
                <p className="font-medium text-destructive">Fahrzeitkonflikt</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nicht genug Zeit für die Anfahrt zwischen den Einsätzen.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-muted-foreground">Fahrzeiten geprüft</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ausreichend Zeit für Anfahrt vorhanden.
                </p>
              </>
            )}
          </div>
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-current/20 space-y-3">
            {travelInfo.previousAssignment && travelInfo.previousTravelMinutes !== null && (
              <div className={cn(
                "flex items-start gap-3 p-2 rounded-lg",
                travelInfo.previousConflict ? "bg-destructive/10" : "bg-muted/20"
              )}>
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 text-xs">
                  <p className="font-medium">
                    Vom vorherigen Einsatz ({travelInfo.previousAssignment.patientName})
                  </p>
                  <p className="text-muted-foreground">
                    Ende: {travelInfo.previousAssignment.endTime.slice(0, 5)} Uhr
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>Fahrzeit: {travelInfo.previousTravelMinutes} Min.</span>
                    <span className="text-muted-foreground">|</span>
                    <span>Verfügbar: {travelInfo.previousGapMinutes} Min.</span>
                    {travelInfo.previousConflict && (
                      <span className="text-destructive font-medium ml-2">
                        ⚠️ {travelInfo.previousTravelMinutes - travelInfo.previousGapMinutes} Min. zu wenig
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {travelInfo.nextAssignment && travelInfo.nextTravelMinutes !== null && (
              <div className={cn(
                "flex items-start gap-3 p-2 rounded-lg",
                travelInfo.nextConflict ? "bg-destructive/10" : "bg-muted/20"
              )}>
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 text-xs">
                  <p className="font-medium">
                    Zum nächsten Einsatz ({travelInfo.nextAssignment.patientName})
                  </p>
                  <p className="text-muted-foreground">
                    Beginn: {travelInfo.nextAssignment.startTime.slice(0, 5)} Uhr
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>Fahrzeit: {travelInfo.nextTravelMinutes} Min.</span>
                    <span className="text-muted-foreground">|</span>
                    <span>Verfügbar: {travelInfo.nextGapMinutes} Min.</span>
                    {travelInfo.nextConflict && (
                      <span className="text-destructive font-medium ml-2">
                        ⚠️ {travelInfo.nextTravelMinutes - travelInfo.nextGapMinutes} Min. zu wenig
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {travelInfo.error && (
              <p className="text-xs text-destructive">{travelInfo.error}</p>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
