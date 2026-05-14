import { useMemo, useState, useCallback } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Assignment, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Thermometer, Palmtree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoData, UserWithQualifications } from '@/hooks/use-demo-data';
import { DraggableAssignmentCard } from '@/components/assignments/DraggableAssignmentCard';
import { DropZone } from '@/components/calendar/DropZone';
import { useAssignmentDragDrop, ConflictInfo, DateChangeInfo } from '@/hooks/use-assignment-drag-drop';
import { ConflictDialog } from '@/components/calendar/ConflictDialog';
import { DateChangeWarningDialog } from '@/components/calendar/DateChangeWarningDialog';
import { RuleViolationBadge, RuleViolationSummary } from '@/components/calendar/RuleViolationBadge';
import { TravelTimeIndicator } from '@/components/calendar/TravelTimeIndicator';
import { useRuleViolations, VacationPeriod } from '@/hooks/use-rule-violations';
import { useEmployeeVacations } from '@/hooks/use-employee-vacations';

interface WeekCalendarProps {
  assignments: Assignment[];
  conflictingAssignmentIds?: Set<string>;
  onAssignmentClick?: (assignment: Assignment) => void;
  onAddClick?: (date: Date) => void;
  onAssignmentMove?: (assignment: Assignment, newEmployeeId: string, newEmployeeName: string, newDate: Date) => void;
  onAssignmentTimeShift?: (assignment: Assignment, newStartTime: string, newEndTime: string, targetEmployeeId: string, targetEmployeeName: string, targetDate: Date) => void;
  onConflictIgnored?: (assignmentId: string, conflictingAssignmentId: string) => void;
  onAssignmentUpdate?: (assignment: Assignment, updates: Partial<Assignment>) => void;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Helper function to check if employee is available on a specific date
function isEmployeeAvailableOnDate(
  employee: UserWithQualifications,
  date: Date
): boolean {
  const availability = employee.availability;
  if (!availability || availability.length === 0) {
    return false; // No availability configured = not visible
  }
  
  // Get day of week (0 = Monday, 6 = Sunday for our system)
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 = Monday
  
  // Find availability for this day
  const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);
  if (!dayAvailability || !dayAvailability.isAvailable) {
    return false;
  }
  
  // Check week pattern (even/odd)
  const weekPattern = dayAvailability.weekPattern || 'every';
  if (weekPattern !== 'every') {
    const weekOfYear = getWeekNumber(date);
    const isEvenWeek = weekOfYear % 2 === 0;
    if (weekPattern === 'even' && !isEvenWeek) return false;
    if (weekPattern === 'odd' && isEvenWeek) return false;
  }
  
  return true;
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Check if employee has ANY availability configured at all
// (not filtered by specific week - if they have availability data, show them)
function hasAnyAvailabilityConfigured(employee: UserWithQualifications): boolean {
  const availability = employee.availability;
  if (!availability || availability.length === 0) {
    return false; // No availability configured = not visible
  }
  // Has at least one day marked as available
  return availability.some(a => a.isAvailable);
}

export function WeekCalendar({ 
  assignments, 
  conflictingAssignmentIds = new Set(),
  onAssignmentClick, 
  onAddClick,
  onAssignmentMove,
  onAssignmentTimeShift,
  onConflictIgnored,
  onAssignmentUpdate,
}: WeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | string>('all');
  const [hideSickEmployees, setHideSickEmployees] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [conflictAssignment, setConflictAssignment] = useState<Assignment | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  
  // Date change warning state
  const [dateChangeInfo, setDateChangeInfo] = useState<DateChangeInfo | null>(null);
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  
  // Get employees and colors from demo data hook (handles demo mode automatically)
  const { employees: allEmployees, employeeColors, useDemo } = useDemoData();
  
  // Calculate week days first (needed for availability filtering)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Show all employees, optionally filter out sick ones
  const employees = useMemo(() => {
    let filtered = allEmployees;
    
    // Filter out sick employees only if toggle is enabled
    if (hideSickEmployees) {
      filtered = filtered.filter(emp => !(emp as UserWithQualifications).isSick);
    }
    
    return filtered;
  }, [allEmployees, hideSickEmployees]);
  
  // Count sick employees for display
  const sickCount = useMemo(() => {
    return allEmployees.filter(emp => (emp as UserWithQualifications).isSick).length;
  }, [allEmployees]);

  // Fetch vacations for rule violation checks
  const { vacations } = useEmployeeVacations();
  
  // Map vacations to the format expected by useRuleViolations
  const vacationPeriods: VacationPeriod[] = useMemo(() => {
    return vacations.map(v => ({
      employeeId: v.employeeId,
      startDate: v.startDate,
      endDate: v.endDate,
      status: v.status,
    }));
  }, [vacations]);

  // Rule violations check - include availability data for each employee and vacations
  const { violationsByAssignment, hardViolations, softViolations } = useRuleViolations(
    assignments,
    employees.map(e => ({ 
      id: e.id, 
      name: e.name,
      availability: (e as UserWithQualifications).availability,
    })),
    weekStart,
    weekEnd,
    vacationPeriods
  );

  const handleConflictDetected = useCallback((conflict: ConflictInfo, assignment: Assignment) => {
    setConflictInfo(conflict);
    setConflictAssignment(assignment);
    setShowConflictDialog(true);
  }, []);

  const handleDateChangeDetected = useCallback((info: DateChangeInfo) => {
    setDateChangeInfo(info);
    setShowDateChangeWarning(true);
  }, []);

  const handleDateChangeConfirm = useCallback(() => {
    if (dateChangeInfo) {
      onAssignmentMove?.(
        dateChangeInfo.assignment,
        dateChangeInfo.targetEmployeeId,
        dateChangeInfo.targetEmployeeName,
        dateChangeInfo.targetDate
      );
      // Toast wird in CalendarPage.handleAssignmentMove angezeigt - keine Duplikate
    }
    setShowDateChangeWarning(false);
    setDateChangeInfo(null);
  }, [dateChangeInfo, onAssignmentMove]);

  const handleDateChangeCancel = useCallback(() => {
    setShowDateChangeWarning(false);
    setDateChangeInfo(null);
  }, []);

  const handleSelectAlternative = useCallback((employeeId: string, employeeName: string) => {
    if (conflictAssignment && conflictInfo) {
      onAssignmentMove?.(conflictAssignment, employeeId, employeeName, conflictInfo.targetDate);
    }
    setConflictInfo(null);
    setConflictAssignment(null);
  }, [conflictAssignment, conflictInfo, onAssignmentMove]);

  const handleSelectTimeShift = useCallback((newStartTime: string, newEndTime: string) => {
    if (conflictAssignment && conflictInfo) {
      onAssignmentTimeShift?.(
        conflictAssignment, 
        newStartTime, 
        newEndTime, 
        conflictInfo.targetEmployeeId, 
        conflictInfo.targetEmployeeName, 
        conflictInfo.targetDate
      );
    }
    setConflictInfo(null);
    setConflictAssignment(null);
  }, [conflictAssignment, conflictInfo, onAssignmentTimeShift]);

  const handleIgnoreConflict = useCallback(() => {
    if (conflictAssignment && conflictInfo?.conflictingAssignment) {
      // Move despite conflict
      onAssignmentMove?.(
        conflictAssignment, 
        conflictInfo.targetEmployeeId, 
        conflictInfo.targetEmployeeName, 
        conflictInfo.targetDate
      );
      // Notify parent about ignored conflict
      onConflictIgnored?.(conflictAssignment.id, conflictInfo.conflictingAssignment.id);
    }
    setConflictInfo(null);
    setConflictAssignment(null);
  }, [conflictAssignment, conflictInfo, onAssignmentMove, onConflictIgnored]);

  const {
    draggedAssignment,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDropTargetActive,
  } = useAssignmentDragDrop({
    onAssignmentMove,
    allAssignments: assignments,
    allEmployees: employees,
    onConflictDetected: handleConflictDetected,
    onDateChangeDetected: handleDateChangeDetected,
  });

  const filteredAssignments = useMemo(() => {
    if (viewMode === 'all') return assignments;
    return assignments.filter(a => a.assignedEmployeeId === viewMode);
  }, [assignments, viewMode]);

  const goToPreviousWeek = () => setCurrentDate(d => addDays(d, -7));
  const goToNextWeek = () => setCurrentDate(d => addDays(d, 7));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Get assignments for a specific employee on a specific day
  const getAssignmentsForEmployeeDay = useCallback((employeeId: string, date: Date) => {
    return filteredAssignments
      .filter(a => a.assignedEmployeeId === employeeId && isSameDay(new Date(a.date), date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredAssignments]);

  // Calculate gap in minutes between two time strings
  const calculateGapMinutes = useCallback((endTime: string, startTime: string): number => {
    const [endH, endM] = endTime.split(':').map(Number);
    const [startH, startM] = startTime.split(':').map(Number);
    return (startH * 60 + startM) - (endH * 60 + endM);
  }, []);

  // Get color for employee - all colors are now HEX values
  const getEmployeeColor = useCallback((employeeId: string): string => {
    const color = employeeColors[employeeId];
    if (!color) return '#6366f1'; // Default indigo
    // All colors are now HEX values directly
    return color;
  }, [employeeColors]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(weekStart, "'KW' w, MMMM yyyy", { locale: de })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Heute
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Employee Filter */}
        <div className="flex items-center gap-4">
          {/* Sick Employee Filter Toggle */}
          {sickCount > 0 && (
            <div className="flex items-center gap-2 border-r pr-4">
              <Switch
                id="hide-sick"
                checked={hideSickEmployees}
                onCheckedChange={setHideSickEmployees}
              />
              <Label htmlFor="hide-sick" className="text-sm flex items-center gap-1.5 cursor-pointer">
                <Thermometer className="h-3.5 w-3.5 text-destructive" />
                <span className="text-muted-foreground">Kranke ausblenden</span>
                <span className="text-xs text-destructive">({sickCount})</span>
              </Label>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ansicht:</span>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
              >
                Alle
              </Button>
              {employees.map(emp => {
                const isSick = (emp as UserWithQualifications).isSick;
                return (
                  <Button
                    key={emp.id}
                    variant={viewMode === emp.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(emp.id)}
                    className={cn("gap-2", isSick && "opacity-60")}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getEmployeeColor(emp.id) }}
                    />
                    {emp.name.split(' ')[0]}
                    {isSick && <Thermometer className="h-3 w-3 text-destructive" />}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Hint */}
      {isDragging && (
        <div className={cn(
          "mb-4 p-2 rounded-lg text-center text-sm",
          useDemo ? "bg-orange-500/10 text-orange-600" : "bg-primary/10 text-primary"
        )}>
          Einsatz zu einem anderen Mitarbeiter oder Tag ziehen
        </div>
      )}

      {/* Rule Violation Summary */}
      {(hardViolations.length > 0 || softViolations.length > 0) && (
        <div className="mb-4">
          <RuleViolationSummary hardCount={hardViolations.length} softCount={softViolations.length} />
        </div>
      )}

      {/* Calendar Grid - Employee Rows Layout */}
      <div className="border rounded-lg overflow-hidden flex-1">
        {/* Header Row */}
        <div className="grid grid-cols-8 bg-muted">
          <div className="p-3 font-medium border-r text-sm">Mitarbeiter</div>
          {weekDays.map((day, idx) => (
            <div 
              key={idx} 
              className={cn(
                'text-center py-2 font-medium border-r last:border-r-0',
                isToday(day) && (useDemo ? 'bg-orange-500 text-white' : 'bg-primary text-primary-foreground')
              )}
            >
              <div className="text-xs uppercase">{DAYS[idx]}</div>
              <div className="text-lg">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        
        {/* Employee Rows */}
        {employees.map(employee => {
          const isSick = (employee as UserWithQualifications).isSick;
          return (
            <div key={employee.id} className={cn("grid grid-cols-8 border-t", isSick && "opacity-50 bg-destructive/5")}>
              {/* Employee Name Cell */}
              <div className="p-3 border-r bg-muted/50 flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getEmployeeColor(employee.id) }}
                />
                <span className={cn("font-medium text-sm truncate", isSick && "line-through")}>{employee.name}</span>
                {isSick && <Thermometer className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
              </div>
            
            {/* Day Cells */}
            {weekDays.map((day, dayIdx) => {
              const dayAssignments = getAssignmentsForEmployeeDay(employee.id, day);
              const isDropHere = isDropTargetActive(employee.id, day);
              const isAvailableThisDay = isEmployeeAvailableOnDate(employee as UserWithQualifications, day);
              const dateStr = format(day, 'yyyy-MM-dd');
              const vacationEntry = vacations.find(v => 
                v.employeeId === employee.id && 
                v.status === 'approved' && 
                v.startDate <= dateStr && 
                v.endDate >= dateStr
              );
              const isOnVacation = !!vacationEntry;
              
              return (
                <DropZone
                  key={dayIdx}
                  employeeId={employee.id}
                  employeeName={employee.name}
                  date={day}
                  isActive={isDropHere}
                  isDragging={isDragging}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-r last:border-r-0 min-h-[120px] relative",
                    !isAvailableThisDay && !isOnVacation && "bg-muted/50",
                    isOnVacation && "bg-chart-2/10"
                  )}
                >
                  {/* Vacation indicator */}
                  {isOnVacation && (
                    <div className="absolute top-1 right-1 z-10">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-chart-2/20 text-chart-2">
                              <Palmtree className="h-3 w-3" />
                              <span className="text-[10px] font-medium">Ferien</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{employee.name} – Ferien ({vacationEntry.startDate} bis {vacationEntry.endDate})</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  {/* Unavailable indicator */}
                  {!isAvailableThisDay && !isOnVacation && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,hsl(var(--muted))_8px,hsl(var(--muted))_9px)] opacity-30" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {dayAssignments.map((assignment, idx) => {
                      const violations = violationsByAssignment.get(assignment.id) || [];
                      const previousAssignment = idx > 0 ? dayAssignments[idx - 1] : null;
                      const gapMinutes = previousAssignment 
                        ? calculateGapMinutes(previousAssignment.endTime, assignment.startTime) 
                        : 0;
                      
                      return (
                        <div key={assignment.id}>
                          {/* Travel Time Indicator between assignments */}
                          {previousAssignment && previousAssignment.patientAddress && assignment.patientAddress && (
                            <TravelTimeIndicator
                              fromAddress={previousAssignment.patientAddress}
                              toAddress={assignment.patientAddress}
                              gapMinutes={gapMinutes}
                              fromPatientName={previousAssignment.patientName}
                              toPatientName={assignment.patientName}
                            />
                          )}
                          
                          <div className="relative">
                            <DraggableAssignmentCard
                              assignment={assignment}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                if (!isDragging) {
                                  onAssignmentClick?.(assignment);
                                }
                              }}
                              isDragging={draggedAssignment?.id === assignment.id}
                              hasConflict={conflictingAssignmentIds.has(assignment.id) || violations.some(v => v.category === 'hard')}
                              compact
                            />
                            {violations.length > 0 && (
                              <RuleViolationBadge 
                                violations={violations} 
                                compact 
                                assignment={assignment}
                                onApplySolution={onAssignmentUpdate ? (solution) => {
                                  const updates: Partial<Assignment> = {};
                                  if (solution.suggestedEmployeeId) {
                                    const emp = employees.find(e => e.id === solution.suggestedEmployeeId);
                                    updates.assignedEmployeeId = solution.suggestedEmployeeId;
                                    if (emp) {
                                      updates.assignedEmployeeName = emp.name;
                                    }
                                  }
                                  if (solution.suggestedStartTime) {
                                    updates.startTime = solution.suggestedStartTime;
                                    updates.preferredStartTime = solution.suggestedStartTime;
                                  }
                                  if (solution.suggestedEndTime) {
                                    updates.endTime = solution.suggestedEndTime;
                                    updates.preferredEndTime = solution.suggestedEndTime;
                                  }
                                  if (Object.keys(updates).length > 0) {
                                    onAssignmentUpdate(assignment, updates);
                                  }
                                } : undefined}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add Button - only show if onAddClick is provided */}
                    {!isDragging && onAddClick && (
                      <button
                        onClick={() => onAddClick(day)}
                        className={cn(
                          "w-full py-1 border border-dashed rounded transition-colors flex items-center justify-center gap-1 text-xs",
                          useDemo 
                            ? "border-orange-300 text-orange-400 hover:border-orange-500 hover:text-orange-500"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        )}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </DropZone>
              );
            })}
          </div>
          );
        })}
      </div>

      {/* Employee Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap text-sm">
        <span className="text-muted-foreground">Legende:</span>
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getEmployeeColor(emp.id) }}
            />
            <span>{emp.name}</span>
          </div>
        ))}
      </div>

      {/* Conflict Dialog */}
      <ConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflictingAssignment={conflictInfo?.conflictingAssignment || null}
        draggedAssignment={conflictAssignment}
        targetEmployeeName={conflictInfo?.targetEmployeeName || ''}
        availableEmployees={conflictInfo?.availableEmployees || []}
        onSelectAlternative={handleSelectAlternative}
        onSelectTimeShift={handleSelectTimeShift}
        onIgnore={handleIgnoreConflict}
        onCancel={() => {
          setConflictInfo(null);
          setConflictAssignment(null);
        }}
      />

      {/* Date Change Warning Dialog */}
      <DateChangeWarningDialog
        open={showDateChangeWarning}
        onOpenChange={setShowDateChangeWarning}
        assignment={dateChangeInfo?.assignment || null}
        originalDate={dateChangeInfo?.originalDate || null}
        targetDate={dateChangeInfo?.targetDate || null}
        targetEmployeeName={dateChangeInfo?.targetEmployeeName || ''}
        onConfirm={handleDateChangeConfirm}
        onCancel={handleDateChangeCancel}
      />
    </div>
  );
}
