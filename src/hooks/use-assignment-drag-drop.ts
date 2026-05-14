import { useState, useCallback } from 'react';
import { isSameDay, format } from 'date-fns';
import { Assignment } from '@/types';
import { toast } from 'sonner';

export interface DropTarget {
  employeeId: string;
  employeeName: string;
  date: Date;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingAssignment?: Assignment;
  availableEmployees: { id: string; name: string }[];
  targetEmployeeName: string;
  targetEmployeeId: string;
  targetDate: Date;
}

export interface DateChangeInfo {
  assignment: Assignment;
  originalDate: Date;
  targetDate: Date;
  targetEmployeeId: string;
  targetEmployeeName: string;
}

export interface UseAssignmentDragDropOptions {
  onAssignmentMove?: (assignment: Assignment, newEmployeeId: string, newEmployeeName: string, newDate: Date) => void;
  allAssignments?: Assignment[];
  allEmployees?: { id: string; name: string }[];
  onConflictDetected?: (conflict: ConflictInfo, assignment: Assignment) => void;
  onDateChangeDetected?: (dateChangeInfo: DateChangeInfo) => void;
}

// Helper to check time overlap
function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return !(endA <= startB || startA >= endB);
}

// Check for conflicts when moving an assignment
function checkConflicts(
  assignment: Assignment,
  targetEmployeeId: string,
  targetEmployeeName: string,
  targetDate: Date,
  allAssignments: Assignment[],
  allEmployees: { id: string; name: string }[]
): ConflictInfo {
  const dateStr = format(targetDate, 'yyyy-MM-dd');
  
  // Find conflicting assignment for target employee
  const targetEmployeeAssignments = allAssignments.filter(a =>
    a.assignedEmployeeId === targetEmployeeId &&
    format(new Date(a.date), 'yyyy-MM-dd') === dateStr &&
    a.id !== assignment.id &&
    a.status !== 'cancelled'
  );

  let conflictingAssignment: Assignment | undefined;
  for (const a of targetEmployeeAssignments) {
    if (hasTimeOverlap(assignment.startTime, assignment.endTime, a.startTime, a.endTime)) {
      conflictingAssignment = a;
      break;
    }
  }

  // Find available employees (no conflict)
  const availableEmployees = allEmployees.filter(emp => {
    if (emp.id === targetEmployeeId) return false;
    
    const empAssignments = allAssignments.filter(a =>
      a.assignedEmployeeId === emp.id &&
      format(new Date(a.date), 'yyyy-MM-dd') === dateStr &&
      a.id !== assignment.id &&
      a.status !== 'cancelled'
    );

    for (const a of empAssignments) {
      if (hasTimeOverlap(assignment.startTime, assignment.endTime, a.startTime, a.endTime)) {
        return false;
      }
    }
    return true;
  });

  return {
    hasConflict: !!conflictingAssignment,
    conflictingAssignment,
    availableEmployees,
    targetEmployeeName,
    targetEmployeeId,
    targetDate,
  };
}

export function useAssignmentDragDrop(options: UseAssignmentDragDropOptions = {}) {
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, assignment: Assignment) => {
    setDraggedAssignment(assignment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', assignment.id);
    
    // Add a slight delay to set the drag image
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedAssignment(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, employeeId: string, employeeName: string, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ employeeId, employeeName, date });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetEmployeeId: string, targetEmployeeName: string, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedAssignment) return;
    
    // Check if actually moved
    const sameEmployee = draggedAssignment.assignedEmployeeId === targetEmployeeId;
    const sameDate = isSameDay(new Date(draggedAssignment.date), targetDate);
    
    if (sameEmployee && sameDate) {
      setDraggedAssignment(null);
      setDropTarget(null);
      return;
    }

    // Check for conflicts
    const allAssignments = options.allAssignments || [];
    const allEmployees = options.allEmployees || [];
    const conflictInfo = checkConflicts(
      draggedAssignment,
      targetEmployeeId,
      targetEmployeeName,
      targetDate,
      allAssignments,
      allEmployees
    );

    if (conflictInfo.hasConflict && conflictInfo.conflictingAssignment) {
      // Use callback if provided, otherwise show toast
      if (options.onConflictDetected) {
        options.onConflictDetected(conflictInfo, draggedAssignment);
      } else {
        const conflict = conflictInfo.conflictingAssignment;
        const availableNames = conflictInfo.availableEmployees.slice(0, 3).map(e => e.name).join(', ');
        
        toast.error('Terminkonflikt!', {
          description: `${targetEmployeeName} hat bereits einen Einsatz von ${conflict.startTime} bis ${conflict.endTime} (${conflict.patientName}).`,
          duration: 6000,
        });

        if (conflictInfo.availableEmployees.length > 0) {
          toast.info('Verfügbare Mitarbeiter:innen', {
            description: availableNames + (conflictInfo.availableEmployees.length > 3 ? ` (+${conflictInfo.availableEmployees.length - 3} weitere)` : ''),
            duration: 6000,
          });
        }
      }
      
      setDraggedAssignment(null);
      setDropTarget(null);
      return; // Don't move the assignment
    }

    // Check if date is changing - show warning
    if (!sameDate && options.onDateChangeDetected) {
      options.onDateChangeDetected({
        assignment: draggedAssignment,
        originalDate: new Date(draggedAssignment.date),
        targetDate,
        targetEmployeeId,
        targetEmployeeName,
      });
      setDraggedAssignment(null);
      setDropTarget(null);
      return; // Wait for user confirmation
    }

    // Call the provided callback
    if (options.onAssignmentMove) {
      options.onAssignmentMove(draggedAssignment, targetEmployeeId, targetEmployeeName, targetDate);
    }
    
    toast.success('Einsatz verschoben', {
      description: `${draggedAssignment.patientName} wurde zu ${targetEmployeeName} verschoben.`,
    });
    
    setDraggedAssignment(null);
    setDropTarget(null);
  }, [draggedAssignment, options]);

  const isDropTargetActive = useCallback((employeeId: string, date: Date) => {
    return dropTarget?.employeeId === employeeId && isSameDay(dropTarget.date, date);
  }, [dropTarget]);

  const isDragging = draggedAssignment !== null;

  return {
    draggedAssignment,
    dropTarget,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDropTargetActive,
  };
}
