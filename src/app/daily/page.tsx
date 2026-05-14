'use client'

import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDemoData } from '@/hooks/use-demo-data';
import { useAssignments } from '@/hooks/use-assignments';
import { Assignment, AssignmentStatus } from '@/types';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableAssignmentCard } from '@/components/assignments/DraggableAssignmentCard';
import { DropZone } from '@/components/calendar/DropZone';
import { useAssignmentDragDrop } from '@/hooks/use-assignment-drag-drop';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DailyPage() {
  const { useDemo, demoOrgName, assignments: initialAssignments, employees, employeeColors, isLoading } = useDemoData();
  const { updateAssignment } = useAssignments();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);

  useEffect(() => { setAssignments(initialAssignments); }, [initialAssignments]);

  const handleAssignmentMove = useCallback(async (assignment: Assignment, newEmployeeId: string, newEmployeeName: string, newDate: Date) => {
    if (useDemo) {
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, assignedEmployeeId: newEmployeeId, assignedEmployeeName: newEmployeeName, date: newDate, updatedAt: new Date() } : a));
      toast.success('Einsatz verschoben', { description: `${assignment.patientName} wurde zu ${newEmployeeName} verschoben.` });
      return;
    }
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, data: { assigned_employee_id: newEmployeeId || null, date: format(newDate, 'yyyy-MM-dd') } });
      toast.success('Einsatz verschoben');
    } catch {
      toast.error('Fehler beim Verschieben');
    }
  }, [useDemo, updateAssignment]);

  const { draggedAssignment, isDragging, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, isDropTargetActive } = useAssignmentDragDrop({
    onAssignmentMove: handleAssignmentMove,
    allAssignments: assignments,
    allEmployees: employees,
  });

  const dayAssignments = useMemo(() => {
    return assignments
      .filter(a => {
        const aDate = new Date(a.date);
        return aDate.getDate() === selectedDate.getDate() && aDate.getMonth() === selectedDate.getMonth() && aDate.getFullYear() === selectedDate.getFullYear();
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDate, assignments]);

  const assignmentsByEmployee = useMemo(() => {
    const grouped: Record<string, Assignment[]> = {};
    employees.forEach(emp => {
      grouped[emp.id] = dayAssignments.filter(a => a.assignedEmployeeId === emp.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [dayAssignments, employees]);

  const conflicts = useMemo(() => {
    const employeeAssignments: Record<string, Assignment[]> = {};
    dayAssignments.forEach(a => {
      if (a.assignedEmployeeId) {
        if (!employeeAssignments[a.assignedEmployeeId]) employeeAssignments[a.assignedEmployeeId] = [];
        employeeAssignments[a.assignedEmployeeId].push(a);
      }
    });
    const conflictIds: string[] = [];
    Object.values(employeeAssignments).forEach(empassignments => {
      for (let i = 0; i < empassignments.length; i++) {
        for (let j = i + 1; j < empassignments.length; j++) {
          const a = empassignments[i], b = empassignments[j];
          if (a.endTime > b.startTime && a.startTime < b.endTime) conflictIds.push(a.id, b.id);
        }
      }
    });
    return new Set(conflictIds);
  }, [dayAssignments]);

  const handleStatusChange = useCallback(async (assignment: Assignment, newStatus: AssignmentStatus) => {
    if (useDemo) {
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, status: newStatus, updatedAt: new Date() } : a));
      toast.success('Status aktualisiert');
      return;
    }
    const dbStatus = newStatus === 'in-progress' ? 'in_progress' : newStatus;
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, data: { status: dbStatus } });
      toast.success('Status aktualisiert');
    } catch {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  }, [useDemo, updateAssignment]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-8">
        {useDemo && (
          <Alert className="mb-6 border-orange-500 bg-orange-500/10">
            <Flame className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700"><strong>Demo-Modus:</strong> Tagesliste für "{demoOrgName}" – Einsätze per Drag & Drop verschieben</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Tagesliste</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{useDemo ? `${demoOrgName} – ` : ''}Einsätze per Drag & Drop zwischen Mitarbeitern verschieben</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-semibold">{format(selectedDate, 'EEE, d. MMM yyyy', { locale: de })}</h2>
            {isToday(selectedDate) && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Heute</span>}
          </div>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
          {!isToday(selectedDate) && <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Zu Heute</Button>}
        </div>

        {isDragging && <div className="mb-4 p-2 bg-primary/10 rounded-lg text-center text-sm text-primary">Einsatz zu einem anderen Mitarbeiter ziehen</div>}

        {conflicts.size > 0 && (
          <Card className="mb-6 p-4 border-accent bg-accent/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <div><p className="font-medium text-accent">Zeitkonflikt erkannt</p><p className="text-sm text-muted-foreground">Es gibt überlappende Einsätze für denselben Mitarbeitenden.</p></div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{dayAssignments.length} Einsätze</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">{dayAssignments.filter(a => a.priority === 'urgent').length} dringend</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">{dayAssignments.filter(a => a.status === 'completed').length} erledigt</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(employee => (
            <Card key={employee.id} className="overflow-hidden">
              <div className="p-3 bg-muted border-b">
                <h3 className="font-semibold">{employee.name}</h3>
                <p className="text-xs text-muted-foreground">{assignmentsByEmployee[employee.id]?.length || 0} Einsätze</p>
              </div>
              <DropZone employeeId={employee.id} employeeName={employee.name} date={selectedDate} isActive={isDropTargetActive(employee.id, selectedDate)} isDragging={isDragging} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="p-2">
                {assignmentsByEmployee[employee.id]?.length === 0 && !isDragging ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Keine Einsätze</p>
                ) : (
                  <div className="space-y-2">
                    {assignmentsByEmployee[employee.id]?.map(assignment => (
                      <div key={assignment.id} className={cn(conflicts.has(assignment.id) && 'ring-2 ring-accent ring-offset-2 rounded-lg')}>
                        <DraggableAssignmentCard assignment={assignment} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onClick={() => { if (!isDragging) { setSelectedAssignment(assignment); setSheetOpen(true); } }} onQuickComplete={(a) => handleStatusChange(a, 'completed')} isDragging={draggedAssignment?.id === assignment.id} compact={false} />
                      </div>
                    ))}
                  </div>
                )}
              </DropZone>
            </Card>
          ))}
        </div>

        <AssignmentDetailSheet assignment={selectedAssignment} open={sheetOpen} onOpenChange={setSheetOpen} onStatusChange={handleStatusChange} />
      </div>
    </AppLayout>
  );
}
