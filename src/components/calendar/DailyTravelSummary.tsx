import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Car, Clock, MapPin, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Assignment } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TravelSegment {
  fromPatientName: string;
  toPatientName: string;
  fromAddress: string;
  toAddress: string;
  travelTimeMinutes: number | null;
  distanceMeters: number | null;
  gapMinutes: number;
  hasConflict: boolean;
  loading: boolean;
  error: string | null;
}

interface EmployeeDaySummary {
  employeeId: string;
  employeeName: string;
  segments: TravelSegment[];
  totalTravelMinutes: number;
  totalDistanceKm: number;
  conflictCount: number;
  loading: boolean;
}

interface DailyTravelSummaryProps {
  assignments: Assignment[];
  employees: Array<{ id: string; name: string }>;
  selectedDate: Date;
  employeeColors?: Record<string, string>;
}

export function DailyTravelSummary({
  assignments,
  employees,
  selectedDate,
  employeeColors = {},
}: DailyTravelSummaryProps) {
  const [summaries, setSummaries] = useState<EmployeeDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [openEmployees, setOpenEmployees] = useState<Set<string>>(new Set());

  // Get assignments for the selected day, grouped by employee
  const dayAssignmentsByEmployee = useMemo(() => {
    const byEmployee = new Map<string, Assignment[]>();
    
    assignments
      .filter(a => a.assignedEmployeeId && isSameDay(new Date(a.date), selectedDate))
      .forEach(a => {
        const existing = byEmployee.get(a.assignedEmployeeId!) || [];
        existing.push(a);
        byEmployee.set(a.assignedEmployeeId!, existing);
      });
    
    // Sort each employee's assignments by start time
    byEmployee.forEach((asgList, empId) => {
      asgList.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    return byEmployee;
  }, [assignments, selectedDate]);

  // Calculate travel times for all employees
  useEffect(() => {
    const calculateTravelTimes = async () => {
      setLoading(true);
      const newSummaries: EmployeeDaySummary[] = [];

      for (const [employeeId, empAssignments] of dayAssignmentsByEmployee.entries()) {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee || empAssignments.length < 2) {
          // No travel segments if less than 2 assignments
          newSummaries.push({
            employeeId,
            employeeName: employee?.name || 'Unbekannt',
            segments: [],
            totalTravelMinutes: 0,
            totalDistanceKm: 0,
            conflictCount: 0,
            loading: false,
          });
          continue;
        }

        const segments: TravelSegment[] = [];
        
        // Calculate travel between consecutive assignments
        for (let i = 0; i < empAssignments.length - 1; i++) {
          const from = empAssignments[i];
          const to = empAssignments[i + 1];
          
          if (!from.patientAddress || !to.patientAddress) {
            continue;
          }

          // Calculate gap in minutes
          const [endH, endM] = from.endTime.split(':').map(Number);
          const [startH, startM] = to.startTime.split(':').map(Number);
          const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);

          const segment: TravelSegment = {
            fromPatientName: from.patientName,
            toPatientName: to.patientName,
            fromAddress: from.patientAddress,
            toAddress: to.patientAddress,
            travelTimeMinutes: null,
            distanceMeters: null,
            gapMinutes,
            hasConflict: false,
            loading: true,
            error: null,
          };

          try {
            const { data, error } = await supabase.functions.invoke('calculate-travel-time', {
              body: {
                originAddress: from.patientAddress,
                destinationAddress: to.patientAddress,
              },
            });

            if (error) {
              segment.error = 'API nicht verfügbar';
              segment.loading = false;
            } else if (data?.error) {
              segment.error = data.error;
              segment.loading = false;
            } else if (data) {
              segment.travelTimeMinutes = data.travelTimeMinutes;
              segment.distanceMeters = data.distanceMeters;
              segment.hasConflict = gapMinutes < data.travelTimeMinutes;
              segment.loading = false;
            }
          } catch (err) {
            segment.error = 'Fehler';
            segment.loading = false;
          }

          segments.push(segment);
        }

        const totalTravelMinutes = segments.reduce((sum, s) => sum + (s.travelTimeMinutes || 0), 0);
        const totalDistanceKm = segments.reduce((sum, s) => sum + ((s.distanceMeters || 0) / 1000), 0);
        const conflictCount = segments.filter(s => s.hasConflict).length;

        newSummaries.push({
          employeeId,
          employeeName: employee.name,
          segments,
          totalTravelMinutes,
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
          conflictCount,
          loading: false,
        });
      }

      setSummaries(newSummaries);
      setLoading(false);
    };

    if (dayAssignmentsByEmployee.size > 0) {
      calculateTravelTimes();
    } else {
      setSummaries([]);
    }
  }, [dayAssignmentsByEmployee, employees]);

  const toggleEmployee = (employeeId: string) => {
    setOpenEmployees(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  // Calculate totals
  const grandTotalMinutes = summaries.reduce((sum, s) => sum + s.totalTravelMinutes, 0);
  const grandTotalKm = summaries.reduce((sum, s) => sum + s.totalDistanceKm, 0);
  const totalConflicts = summaries.reduce((sum, s) => sum + s.conflictCount, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Tagesübersicht Fahrzeiten
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Berechne Fahrzeiten...</span>
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            Tagesübersicht Fahrzeiten – {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Keine Einsätze mit Fahrzeiten für diesen Tag.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Tagesübersicht Fahrzeiten – {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
          </div>
          <div className="flex items-center gap-4 text-sm font-normal">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {Math.floor(grandTotalMinutes / 60)}h {grandTotalMinutes % 60}min
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {Math.round(grandTotalKm * 10) / 10} km
            </span>
            {totalConflicts > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalConflicts} Konflikte
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {summaries.map(summary => {
          const isOpen = openEmployees.has(summary.employeeId);
          const color = employeeColors[summary.employeeId] || '#6366f1';
          
          return (
            <Collapsible
              key={summary.employeeId}
              open={isOpen}
              onOpenChange={() => toggleEmployee(summary.employeeId)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 py-2 h-auto",
                    summary.conflictCount > 0 && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{summary.employeeName}</span>
                    {summary.conflictCount > 0 && (
                      <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                        {summary.conflictCount} Konflikt{summary.conflictCount !== 1 ? 'e' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {summary.totalTravelMinutes} min / {summary.totalDistanceKm} km
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {summary.segments.length === 0 ? (
                  <div className="px-8 py-2 text-sm text-muted-foreground">
                    Nur ein Einsatz – keine Fahrten
                  </div>
                ) : (
                  <div className="px-8 py-2 space-y-2">
                    {summary.segments.map((segment, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between text-sm p-2 rounded",
                          segment.hasConflict ? "bg-destructive/10" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{segment.fromPatientName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{segment.toPatientName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {segment.loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : segment.error ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              <span className={cn(
                                segment.hasConflict && "text-destructive font-medium"
                              )}>
                                {segment.travelTimeMinutes} min
                              </span>
                              <span className="text-muted-foreground">
                                {segment.distanceMeters 
                                  ? `${Math.round(segment.distanceMeters / 100) / 10} km` 
                                  : '—'
                                }
                              </span>
                              {segment.hasConflict && (
                                <span className="text-xs text-destructive">
                                  ({segment.gapMinutes} min verfügbar)
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
