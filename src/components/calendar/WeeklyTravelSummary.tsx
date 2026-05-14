import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Car, Clock, MapPin, Loader2, ChevronDown, ChevronUp, AlertTriangle, Calendar } from 'lucide-react';
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

interface DaySummary {
  date: Date;
  travelMinutes: number;
  distanceKm: number;
  conflictCount: number;
  segmentCount: number;
}

interface EmployeeWeekSummary {
  employeeId: string;
  employeeName: string;
  days: DaySummary[];
  totalTravelMinutes: number;
  totalDistanceKm: number;
  totalConflicts: number;
  loading: boolean;
}

interface WeeklyTravelSummaryProps {
  assignments: Assignment[];
  employees: Array<{ id: string; name: string }>;
  weekStart: Date;
  employeeColors?: Record<string, string>;
}

export function WeeklyTravelSummary({
  assignments,
  employees,
  weekStart,
  employeeColors = {},
}: WeeklyTravelSummaryProps) {
  const [summaries, setSummaries] = useState<EmployeeWeekSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [openEmployees, setOpenEmployees] = useState<Set<string>>(new Set());

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Get assignments grouped by employee and day
  const assignmentsByEmployeeDay = useMemo(() => {
    const result = new Map<string, Map<string, Assignment[]>>();
    
    assignments
      .filter(a => a.assignedEmployeeId)
      .forEach(a => {
        const empMap = result.get(a.assignedEmployeeId!) || new Map();
        const dateKey = format(new Date(a.date), 'yyyy-MM-dd');
        const dayList = empMap.get(dateKey) || [];
        dayList.push(a);
        empMap.set(dateKey, dayList);
        result.set(a.assignedEmployeeId!, empMap);
      });
    
    // Sort each day's assignments by start time
    result.forEach(empMap => {
      empMap.forEach((asgList, dateKey) => {
        asgList.sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    });
    
    return result;
  }, [assignments]);

  // Calculate travel times for the entire week
  useEffect(() => {
    const calculateWeeklyTravelTimes = async () => {
      setLoading(true);
      const newSummaries: EmployeeWeekSummary[] = [];

      for (const employee of employees) {
        const empAssignments = assignmentsByEmployeeDay.get(employee.id);
        const days: DaySummary[] = [];
        
        for (const day of weekDays) {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAssignments = empAssignments?.get(dateKey) || [];
          
          if (dayAssignments.length < 2) {
            days.push({
              date: day,
              travelMinutes: 0,
              distanceKm: 0,
              conflictCount: 0,
              segmentCount: 0,
            });
            continue;
          }

          let dayTravelMinutes = 0;
          let dayDistanceKm = 0;
          let dayConflicts = 0;
          let segmentCount = 0;

          // Calculate travel between consecutive assignments
          for (let i = 0; i < dayAssignments.length - 1; i++) {
            const from = dayAssignments[i];
            const to = dayAssignments[i + 1];
            
            if (!from.patientAddress || !to.patientAddress) {
              continue;
            }

            // Calculate gap in minutes
            const [endH, endM] = from.endTime.split(':').map(Number);
            const [startH, startM] = to.startTime.split(':').map(Number);
            const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);

            try {
              const { data, error } = await supabase.functions.invoke('calculate-travel-time', {
                body: {
                  originAddress: from.patientAddress,
                  destinationAddress: to.patientAddress,
                },
              });

              if (!error && data && !data.error) {
                dayTravelMinutes += data.travelTimeMinutes || 0;
                dayDistanceKm += (data.distanceMeters || 0) / 1000;
                if (gapMinutes < data.travelTimeMinutes) {
                  dayConflicts++;
                }
                segmentCount++;
              }
            } catch (err) {
              console.warn('Travel time fetch error:', err);
            }
          }

          days.push({
            date: day,
            travelMinutes: dayTravelMinutes,
            distanceKm: Math.round(dayDistanceKm * 10) / 10,
            conflictCount: dayConflicts,
            segmentCount,
          });
        }

        const totalTravelMinutes = days.reduce((sum, d) => sum + d.travelMinutes, 0);
        const totalDistanceKm = days.reduce((sum, d) => sum + d.distanceKm, 0);
        const totalConflicts = days.reduce((sum, d) => sum + d.conflictCount, 0);

        newSummaries.push({
          employeeId: employee.id,
          employeeName: employee.name,
          days,
          totalTravelMinutes,
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
          totalConflicts,
          loading: false,
        });
      }

      setSummaries(newSummaries);
      setLoading(false);
    };

    if (employees.length > 0) {
      calculateWeeklyTravelTimes();
    }
  }, [assignmentsByEmployeeDay, employees, weekDays]);

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
  const totalConflicts = summaries.reduce((sum, s) => sum + s.totalConflicts, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Wochenübersicht Fahrzeiten
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Berechne Wochenfahrzeiten...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Wochenübersicht Fahrzeiten – KW {format(weekStart, 'w, yyyy', { locale: de })}
          </div>
          <div className="flex items-center gap-4 text-sm font-normal">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDuration(grandTotalMinutes)}
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
                    summary.totalConflicts > 0 && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{summary.employeeName}</span>
                    {summary.totalConflicts > 0 && (
                      <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                        {summary.totalConflicts} Konflikt{summary.totalConflicts !== 1 ? 'e' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(summary.totalTravelMinutes)} / {summary.totalDistanceKm} km
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
                <div className="px-8 py-2">
                  <div className="grid grid-cols-7 gap-2 text-sm">
                    {summary.days.map((day, idx) => {
                      const dayName = format(day.date, 'EEE', { locale: de });
                      const hasData = day.segmentCount > 0;
                      
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-2 rounded text-center",
                            day.conflictCount > 0 
                              ? "bg-destructive/10" 
                              : hasData 
                                ? "bg-muted/50" 
                                : "bg-muted/20"
                          )}
                        >
                          <div className="font-medium text-xs text-muted-foreground mb-1">
                            {dayName}
                          </div>
                          {hasData ? (
                            <>
                              <div className={cn(
                                "font-medium",
                                day.conflictCount > 0 && "text-destructive"
                              )}>
                                {day.travelMinutes} min
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {day.distanceKm} km
                              </div>
                              {day.conflictCount > 0 && (
                                <div className="text-xs text-destructive mt-1">
                                  <AlertTriangle className="h-3 w-3 inline" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
