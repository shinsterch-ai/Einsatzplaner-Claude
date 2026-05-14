import { useMemo } from 'react';
import { AlertTriangle, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DbAssignment } from '@/hooks/use-assignments';
import { format } from 'date-fns';
import { ConflictResolutionPopover, ConflictContext } from './ConflictResolutionPopover';

interface Employee {
  id: string;
  name: string;
}

interface ConflictWarningProps {
  selectedEmployeeId: string | undefined;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  existingAssignments: DbAssignment[];
  employees: Employee[];
  currentAssignmentId?: string;
  patientId?: string;
  patientName?: string;
  assignmentType?: string;
  onSelectEmployee: (employeeId: string) => void;
  onApplyTimeChange?: (startTime: string, endTime: string) => void;
}

export function ConflictWarning({
  selectedEmployeeId,
  selectedDate,
  startTime,
  endTime,
  existingAssignments,
  employees,
  currentAssignmentId,
  patientId,
  patientName,
  assignmentType,
  onSelectEmployee,
  onApplyTimeChange,
}: ConflictWarningProps) {
  // Check for conflicts with the selected employee
  const conflict = useMemo(() => {
    if (!selectedEmployeeId || !startTime || !endTime) return null;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Filter assignments for same date and employee
    const employeeAssignments = existingAssignments.filter(a => 
      a.assigned_employee_id === selectedEmployeeId &&
      a.date === dateStr &&
      a.id !== currentAssignmentId &&
      a.status !== 'cancelled'
    );

    // Check for time overlap
    for (const assignment of employeeAssignments) {
      const aStart = assignment.start_time;
      const aEnd = assignment.end_time;
      
      // Overlap check
      if (!(endTime <= aStart || startTime >= aEnd)) {
        return {
          assignment,
          employeeName: assignment.assigned_employee?.full_name || 'Mitarbeiter:in',
        };
      }
    }

    return null;
  }, [selectedEmployeeId, selectedDate, startTime, endTime, existingAssignments, currentAssignmentId]);

  // Find available employees
  const availableEmployees = useMemo(() => {
    if (!startTime || !endTime) return [];

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    return employees.filter(emp => {
      if (emp.id === selectedEmployeeId) return false;

      const empAssignments = existingAssignments.filter(a =>
        a.assigned_employee_id === emp.id &&
        a.date === dateStr &&
        a.id !== currentAssignmentId &&
        a.status !== 'cancelled'
      );

      for (const assignment of empAssignments) {
        const aStart = assignment.start_time;
        const aEnd = assignment.end_time;
        
        if (!(endTime <= aStart || startTime >= aEnd)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedEmployeeId, selectedDate, startTime, endTime, existingAssignments, employees, currentAssignmentId]);

  // Build conflict context for AI
  const conflictContext: ConflictContext | null = useMemo(() => {
    if (!conflict) return null;
    
    return {
      type: 'time_overlap',
      employeeId: selectedEmployeeId,
      employeeName: conflict.employeeName,
      patientId,
      patientName,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      assignmentType,
      overlappingAssignment: {
        id: conflict.assignment.id,
        startTime: conflict.assignment.start_time,
        endTime: conflict.assignment.end_time,
        patientName: conflict.assignment.patient?.full_name,
      },
    };
  }, [conflict, selectedEmployeeId, patientId, patientName, selectedDate, startTime, endTime, assignmentType]);

  if (!conflict) return null;

  const handleApplySolution = (solution: { suggestedEmployeeId?: string; suggestedStartTime?: string; suggestedEndTime?: string }) => {
    if (solution.suggestedEmployeeId) {
      onSelectEmployee(solution.suggestedEmployeeId);
    } else if (solution.suggestedStartTime && solution.suggestedEndTime && onApplyTimeChange) {
      onApplyTimeChange(solution.suggestedStartTime, solution.suggestedEndTime);
    }
  };

  const alertContent = (
    <Alert className="border-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/15 transition-colors">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertDescription className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-destructive">Terminkonflikt erkannt!</p>
            <span className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              KI-Hilfe
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {conflict.employeeName} hat bereits einen Einsatz von{' '}
            <strong>{conflict.assignment.start_time.slice(0, 5)}</strong> bis{' '}
            <strong>{conflict.assignment.end_time.slice(0, 5)}</strong> Uhr
            {conflict.assignment.patient?.full_name && (
              <> bei Klient <strong>{conflict.assignment.patient.full_name}</strong></>
            )}
            .
          </p>
        </div>

        {availableEmployees.length > 0 && (
          <div className="pt-2 border-t border-destructive/20">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Verfügbare Mitarbeiter:innen:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableEmployees.slice(0, 5).map(emp => (
                <Button
                  key={emp.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-primary/50 hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmployee(emp.id);
                  }}
                >
                  {emp.name}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              ))}
              {availableEmployees.length > 5 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{availableEmployees.length - 5} weitere
                </span>
              )}
            </div>
          </div>
        )}

        {availableEmployees.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Klicken für KI-Lösungsvorschläge
          </p>
        )}
      </AlertDescription>
    </Alert>
  );

  if (conflictContext) {
    return (
      <ConflictResolutionPopover
        context={conflictContext}
        onApplySolution={handleApplySolution}
      >
        {alertContent}
      </ConflictResolutionPopover>
    );
  }

  return alertContent;
}
