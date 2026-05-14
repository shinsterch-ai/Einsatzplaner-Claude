'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { AssignmentFormDialog, AssignmentFormValues } from '@/components/assignments/AssignmentFormDialog';
import { RecurringSeriesDialog } from '@/components/assignments/RecurringSeriesDialog';
import { PlanSaveBar } from '@/components/calendar/PlanSaveBar';
import { UnassignedAssignmentsSidebar } from '@/components/calendar/UnassignedAssignmentsSidebar';
import { AIScheduleDialog } from '@/components/calendar/AIScheduleDialog';
import { useDemoData } from '@/hooks/use-demo-data';
import { useUndoStack } from '@/hooks/use-undo-stack';
import { useAssignments } from '@/hooks/use-assignments';
import { Assignment, AssignmentType, RecurrenceType, AssignmentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download, Sparkles, Repeat, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoAssign } from '@/hooks/use-auto-assign';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { DemoRoleSelector } from '@/components/calendar/DemoRoleSelector';
import { AppLayout } from '@/components/layout/AppLayout';

interface ScheduleSuggestion {
  assignmentId: string;
  suggestedEmployeeId: string;
  suggestedEmployeeName: string;
}

export default function CalendarPage() {
  const {
    useDemo,
    demoOrgName,
    assignments: dataAssignments,
    employees,
    employeeColors,
    isLoading: demoLoading
  } = useDemoData();
  const { simulatedRole } = useDemoMode();
  const {
    createAssignment,
    createMultipleAssignments,
    updateAssignment,
    deleteAssignment,
    deleteAssignmentSeries,
    isLoading: dbLoading
  } = useAssignments();
  const { autoAssignBatch, isAssigning } = useAutoAssign();

  const isLoading = demoLoading || dbLoading;

  const [demoAssignments, setDemoAssignments] = useState<Assignment[]>([]);
  const demoInitializedRef = useRef(false);

  useEffect(() => {
    if (useDemo && dataAssignments.length > 0 && !demoInitializedRef.current) {
      setDemoAssignments(dataAssignments);
      demoInitializedRef.current = true;
    }
    if (!useDemo) {
      demoInitializedRef.current = false;
      setDemoAssignments([]);
    }
  }, [useDemo, dataAssignments]);

  const assignments = useDemo ? demoAssignments : dataAssignments;

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiScheduleOpen, setAiScheduleOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [activeConflicts, setActiveConflicts] = useState<Set<string>>(new Set());

  const { canUndo, lastAction, pushAction, popAction, clearStack, undoCount } = useUndoStack();

  useEffect(() => {
    if (!useDemo) {
      setActiveConflicts(new Set());
      clearStack();
      setHasUnsavedChanges(false);
    }
  }, [useDemo, dataAssignments, clearStack]);

  const handleStatusChange = useCallback(async (assignment: Assignment, newStatus: AssignmentStatus) => {
    if (useDemo) {
      setDemoAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, status: newStatus, updatedAt: new Date() } : a));
      setHasUnsavedChanges(true);
      return;
    }
    try {
      const dbStatus = newStatus === 'in-progress' ? 'in_progress' : newStatus;
      await updateAssignment.mutateAsync({ id: assignment.id, data: { status: dbStatus as any } });
      toast.success('Status geändert');
      setSheetOpen(false);
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    }
  }, [useDemo, updateAssignment]);

  const handleDeleteAssignment = useCallback(async (assignment: Assignment) => {
    if (useDemo) {
      setDemoAssignments(prev => prev.filter(a => a.id !== assignment.id));
      setHasUnsavedChanges(true);
      toast.success('Einsatz gelöscht');
      return;
    }
    try { await deleteAssignment.mutateAsync(assignment.id); } catch {}
  }, [useDemo, deleteAssignment]);

  const handleDeleteSeries = useCallback(async (seriesId: string) => {
    if (useDemo) {
      setDemoAssignments(prev => prev.filter(a => a.seriesId !== seriesId));
      setHasUnsavedChanges(true);
      return;
    }
    try { await deleteAssignmentSeries.mutateAsync(seriesId); } catch {}
  }, [useDemo, deleteAssignmentSeries]);

  const handleAssignmentMove = useCallback(async (assignment: Assignment, newEmployeeId: string, newEmployeeName: string, newDate: Date) => {
    if (useDemo) {
      pushAction({ assignmentId: assignment.id, previousEmployeeId: assignment.assignedEmployeeId, previousEmployeeName: assignment.assignedEmployeeName, previousDate: new Date(assignment.date), newEmployeeId, newEmployeeName, newDate });
      setDemoAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, assignedEmployeeId: newEmployeeId, assignedEmployeeName: newEmployeeName, date: newDate, updatedAt: new Date() } : a));
      setHasUnsavedChanges(true);
      return;
    }
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, data: { assigned_employee_id: newEmployeeId || null, date: format(newDate, 'yyyy-MM-dd') } });
      toast.success('Einsatz verschoben', { description: `${assignment.patientName} wurde zu ${newEmployeeName || 'Nicht zugewiesen'} verschoben.` });
    } catch {
      toast.error('Fehler beim Verschieben des Einsatzes');
    }
  }, [useDemo, pushAction, updateAssignment]);

  const handleUndo = useCallback(() => {
    if (!useDemo) return;
    const action = popAction();
    if (!action) return;
    setDemoAssignments(prev => prev.map(a => a.id === action.assignmentId ? { ...a, assignedEmployeeId: action.previousEmployeeId, assignedEmployeeName: action.previousEmployeeName, date: action.previousDate, updatedAt: new Date() } : a));
    setActiveConflicts(prev => { const s = new Set(prev); for (const key of s) { if (key.includes(action.assignmentId)) s.delete(key); } return s; });
    toast.info('Rückgängig gemacht');
    setHasUnsavedChanges(true);
  }, [useDemo, popAction]);

  const handleAssignmentTimeShift = useCallback(async (assignment: Assignment, newStartTime: string, newEndTime: string, targetEmployeeId: string, targetEmployeeName: string, targetDate: Date) => {
    if (useDemo) {
      pushAction({ assignmentId: assignment.id, previousEmployeeId: assignment.assignedEmployeeId, previousEmployeeName: assignment.assignedEmployeeName, previousDate: new Date(assignment.date), newEmployeeId: targetEmployeeId, newEmployeeName: targetEmployeeName, newDate: targetDate });
      setDemoAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, assignedEmployeeId: targetEmployeeId, assignedEmployeeName: targetEmployeeName, date: targetDate, startTime: newStartTime, endTime: newEndTime, updatedAt: new Date() } : a));
      setHasUnsavedChanges(true);
      return;
    }
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, data: { assigned_employee_id: targetEmployeeId || null, date: format(targetDate, 'yyyy-MM-dd'), start_time: newStartTime, end_time: newEndTime } });
    } catch {
      toast.error('Fehler beim Verschieben des Einsatzes');
    }
  }, [useDemo, pushAction, updateAssignment]);

  const handleConflictIgnored = useCallback((assignmentId: string, conflictingAssignmentId: string) => {
    const conflictKey = [assignmentId, conflictingAssignmentId].sort().join('|');
    setActiveConflicts(prev => new Set(prev).add(conflictKey));
  }, []);

  const handleAssignmentUpdate = useCallback(async (assignment: Assignment, updates: Partial<Assignment>) => {
    if (useDemo) {
      setDemoAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, ...updates, updatedAt: new Date() } : a));
      setHasUnsavedChanges(true);
      return;
    }
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.assignedEmployeeId !== undefined) dbUpdates.assigned_employee_id = updates.assignedEmployeeId || null;
      if (updates.startTime) dbUpdates.start_time = updates.startTime;
      if (updates.endTime) dbUpdates.end_time = updates.endTime;
      if (updates.date) dbUpdates.date = format(updates.date as Date, 'yyyy-MM-dd');
      await updateAssignment.mutateAsync({ id: assignment.id, data: dbUpdates });
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [useDemo, updateAssignment]);

  const hasActiveConflicts = activeConflicts.size > 0;

  const conflictingAssignmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflictKey of activeConflicts) {
      const [id1, id2] = conflictKey.split('|');
      ids.add(id1);
      ids.add(id2);
    }
    return ids;
  }, [activeConflicts]);

  const handleSavePlan = useCallback(async () => {
    if (hasActiveConflicts) {
      toast.error('Speichern nicht möglich', { description: `Es bestehen noch ${activeConflicts.size} Terminkonflikt(e).` });
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 800));
    setHasUnsavedChanges(false);
    clearStack();
    toast.success('Wochenplan gespeichert');
  }, [clearStack, hasActiveConflicts, activeConflicts.size]);

  const handleSaveAssignment = async (data: AssignmentFormValues & { patientName: string; zone: string; assignedEmployeeName?: string }) => {
    const startTime = data.preferredStartTime;
    const endTime = data.preferredEndTime;
    const durationMinutes = data.durationMinutes;

    if (useDemo) {
      if (editingAssignment) {
        setDemoAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, date: data.date, startTime, endTime, preferredStartTime: data.preferredStartTime, preferredEndTime: data.preferredEndTime, durationMinutes, patientId: data.patientId, patientName: data.patientName, type: data.type as AssignmentType, zoneId: data.zoneId, zone: data.zone, assignedEmployeeId: data.assignedEmployeeId, assignedEmployeeName: data.assignedEmployeeName, status: data.status, priority: data.priority, internalNote: data.internalNote, employeeNote: data.employeeNote, updatedAt: new Date() } : a));
        setHasUnsavedChanges(true);
        toast.success('Einsatz wurde aktualisiert (Demo)');
      } else {
        const newAssignments: Assignment[] = [];
        const base = { patientId: data.patientId, patientName: data.patientName, type: data.type as AssignmentType, zoneId: data.zoneId, zone: data.zone, assignedEmployeeId: data.assignedEmployeeId, assignedEmployeeName: data.assignedEmployeeName, status: data.status, priority: data.priority, internalNote: data.internalNote, employeeNote: data.employeeNote, startTime, endTime, preferredStartTime: data.preferredStartTime, preferredEndTime: data.preferredEndTime, durationMinutes };
        if (data.recurrence === 'none' || !data.recurrenceEndDate) {
          newAssignments.push({ id: `asg-${Date.now()}`, ...base, date: data.date, createdAt: new Date(), updatedAt: new Date() });
        } else {
          const seriesId = `series-${Date.now()}`;
          let currentDate = new Date(data.date);
          const endDate = new Date(data.recurrenceEndDate);
          let counter = 0;
          while (currentDate <= endDate && counter < 365) {
            newAssignments.push({ id: `asg-${Date.now()}-${counter}`, ...base, date: new Date(currentDate), seriesId, recurrence: data.recurrence as RecurrenceType, recurrenceEndDate: data.recurrenceEndDate, createdAt: new Date(), updatedAt: new Date() });
            currentDate = data.recurrence === 'daily' ? addDays(currentDate, 1) : addWeeks(currentDate, 1);
            counter++;
          }
        }
        setDemoAssignments(prev => [...prev, ...newAssignments]);
        setHasUnsavedChanges(true);
        toast.success(newAssignments.length > 1 ? `${newAssignments.length} Einsätze erstellt (Demo)` : 'Einsatz erstellt (Demo)');
      }
      return;
    }

    try {
      if (editingAssignment) {
        await updateAssignment.mutateAsync({ id: editingAssignment.id, data: { patient_id: data.patientId, assigned_employee_id: data.assignedEmployeeId || null, date: format(data.date, 'yyyy-MM-dd'), preferred_start_time: data.preferredStartTime, preferred_end_time: data.preferredEndTime, duration_minutes: durationMinutes, start_time: startTime, end_time: endTime, type: data.type as any, zone: data.zone || undefined, status: data.status as any, priority: data.priority as any, internal_note: data.internalNote, employee_note: data.employeeNote } });
        toast.success('Einsatz gespeichert');
      } else if (data.recurrence === 'none' || !data.recurrenceEndDate) {
        await createAssignment.mutateAsync({ patient_id: data.patientId, assigned_employee_id: data.assignedEmployeeId || null, date: format(data.date, 'yyyy-MM-dd'), preferred_start_time: data.preferredStartTime, preferred_end_time: data.preferredEndTime, duration_minutes: durationMinutes, start_time: startTime, end_time: endTime, type: data.type as any, zone: data.zone || undefined, status: data.status as any, priority: data.priority as any, internal_note: data.internalNote, employee_note: data.employeeNote, recurrence: 'none' });
        toast.success('Einsatz erstellt');
      } else {
        const dates: string[] = [];
        let currentDate = new Date(data.date);
        const endDate = new Date(data.recurrenceEndDate);
        let counter = 0;
        while (currentDate <= endDate && counter < 365) {
          dates.push(format(currentDate, 'yyyy-MM-dd'));
          currentDate = data.recurrence === 'daily' ? addDays(currentDate, 1) : addWeeks(currentDate, 1);
          counter++;
        }
        const autoAssignResults = await autoAssignBatch({ preferred_start_time: data.preferredStartTime, preferred_end_time: data.preferredEndTime, duration_minutes: durationMinutes, type: data.type, patient_id: data.patientId, zone: data.zone }, dates);
        const seriesId = crypto.randomUUID();
        const assignmentsToCreate = dates.map(date => {
          const autoResult = autoAssignResults.get(date);
          const employeeId = autoResult?.success && autoResult.assigned_employee_id ? autoResult.assigned_employee_id : data.assignedEmployeeId || null;
          const st = autoResult?.success && autoResult.scheduled_start_time ? autoResult.scheduled_start_time : startTime;
          const et = autoResult?.success && autoResult.scheduled_end_time ? autoResult.scheduled_end_time : endTime;
          return { patient_id: data.patientId, assigned_employee_id: employeeId, date, preferred_start_time: data.preferredStartTime, preferred_end_time: data.preferredEndTime, duration_minutes: durationMinutes, start_time: st, end_time: et, type: data.type as any, zone: data.zone || undefined, status: data.status as any, priority: data.priority as any, internal_note: data.internalNote, employee_note: data.employeeNote, recurrence: (data.recurrence === 'custom' ? 'weekly' : data.recurrence) as any, recurrence_end_date: format(data.recurrenceEndDate, 'yyyy-MM-dd'), series_id: seriesId };
        });
        await createMultipleAssignments.mutateAsync(assignmentsToCreate);
        toast.success(`${assignmentsToCreate.length} Einsätze erstellt`);
      }
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleApplyAISuggestions = async (suggestions: ScheduleSuggestion[]) => {
    if (useDemo) {
      setDemoAssignments(prev => {
        const updated = [...prev];
        for (const sug of suggestions) {
          const idx = updated.findIndex(a => a.id === sug.assignmentId);
          if (idx !== -1) updated[idx] = { ...updated[idx], assignedEmployeeId: sug.suggestedEmployeeId, assignedEmployeeName: sug.suggestedEmployeeName, status: 'planned' as AssignmentStatus, updatedAt: new Date() };
        }
        return updated;
      });
      setHasUnsavedChanges(true);
      return;
    }
    for (const sug of suggestions) {
      await updateAssignment.mutateAsync({ id: sug.assignmentId, data: { assigned_employee_id: sug.suggestedEmployeeId, status: 'planned' } });
    }
  };

  const canEdit = !useDemo || simulatedRole !== 'mitarbeiter';

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
      <div className="flex flex-col h-full p-8">
        {useDemo && (
          <Alert className="mb-6 border-orange-500 bg-orange-500/10">
            <Flame className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700 flex items-center justify-between">
              <span><strong>Demo-Modus:</strong> Wochenplan für "{demoOrgName}" – Einsätze per Drag & Drop verschieben{simulatedRole && <span className="ml-2 text-xs">(Ansicht: {simulatedRole === 'mitarbeiter' ? 'Mitarbeiter' : simulatedRole === 'planer' ? 'Planer' : 'Admin'})</span>}</span>
              <DemoRoleSelector />
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Wochenplan</h1>
            <p className="text-muted-foreground mt-1">{useDemo ? `${demoOrgName} – ` : ''}Übersicht aller Einsätze{canEdit && ' – per Drag & Drop verschieben'}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && <Button variant="outline" size="sm" className="gap-2" onClick={() => setSeriesDialogOpen(true)}><Repeat className="h-4 w-4" />Serien</Button>}
            {canEdit && <Button variant="outline" size="sm" className="gap-2" onClick={() => setAiScheduleOpen(true)}><Sparkles className="h-4 w-4" />AI-Planvorschlag</Button>}
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
            {canEdit && <>
              <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
              <Button size="sm" className="gap-2" onClick={() => { setEditingAssignment(null); setInitialDate(new Date()); setFormOpen(true); }}><Plus className="h-4 w-4" />Neuer Einsatz</Button>
            </>}
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-card rounded-xl border p-6 overflow-hidden">
            <WeekCalendar
              assignments={assignments}
              conflictingAssignmentIds={conflictingAssignmentIds}
              onAssignmentClick={(a) => { setSelectedAssignment(a); setSheetOpen(true); }}
              onAddClick={canEdit ? (date) => { setEditingAssignment(null); setInitialDate(date); setFormOpen(true); } : undefined}
              onAssignmentMove={canEdit ? handleAssignmentMove : undefined}
              onAssignmentTimeShift={canEdit ? handleAssignmentTimeShift : undefined}
              onConflictIgnored={handleConflictIgnored}
              onAssignmentUpdate={canEdit ? handleAssignmentUpdate : undefined}
            />
          </div>
          <UnassignedAssignmentsSidebar assignments={assignments} onAssignmentClick={(a) => { setSelectedAssignment(a); setSheetOpen(true); }} />
        </div>

        <AssignmentDetailSheet assignment={selectedAssignment} open={sheetOpen} onOpenChange={setSheetOpen} onEdit={canEdit ? (a) => { setEditingAssignment(a); setInitialDate(undefined); setSheetOpen(false); setFormOpen(true); } : undefined} onStatusChange={canEdit ? handleStatusChange : undefined} onDelete={canEdit ? handleDeleteAssignment : undefined} onDeleteSeries={canEdit ? handleDeleteSeries : undefined} />
        <AssignmentFormDialog open={formOpen} onOpenChange={setFormOpen} assignment={editingAssignment} initialDate={initialDate} onSave={handleSaveAssignment} />
        {useDemo && <PlanSaveBar hasUnsavedChanges={hasUnsavedChanges} onSave={handleSavePlan} autoSaveIntervalMs={10 * 60 * 1000} canUndo={canUndo} lastAction={lastAction} onUndo={handleUndo} undoCount={undoCount} hasActiveConflicts={hasActiveConflicts} conflictCount={activeConflicts.size} />}
        <AIScheduleDialog open={aiScheduleOpen} onOpenChange={setAiScheduleOpen} currentWeekStart={startOfWeek(new Date(), { weekStartsOn: 1 })} onApplySuggestions={handleApplyAISuggestions} useDemo={useDemo} demoAssignments={assignments} />
        <RecurringSeriesDialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen} assignments={assignments} onDeleteSeries={handleDeleteSeries} onViewAssignment={(a) => { setSelectedAssignment(a); setSheetOpen(true); }} />
      </div>
    </AppLayout>
  );
}
