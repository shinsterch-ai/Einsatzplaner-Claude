'use client'

import { useState, useMemo, useEffect } from 'react';
import { addDays, addWeeks, startOfWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoData } from '@/hooks/use-demo-data';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useAssignments } from '@/hooks/use-assignments';
import { useEmployees } from '@/hooks/use-employees';
import { useEmployeeUtilization } from '@/hooks/use-employee-utilization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { AssignmentFormDialog, AssignmentFormValues } from '@/components/assignments/AssignmentFormDialog';
import { EmployeeUtilizationCard } from '@/components/dashboard/EmployeeUtilizationCard';
import { WeeklyTravelSummary } from '@/components/calendar/WeeklyTravelSummary';
import { DailyTravelSummary } from '@/components/calendar/DailyTravelSummary';
import { Assignment, AssignmentType, RecurrenceType } from '@/types';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Plus,
  Flame,
  Thermometer,
  Car,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, isToday, isTomorrow, endOfWeek, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const { useDemo, demoOrgName, assignments: dataAssignments, employees: dataEmployees, employeeColors, isLoading } = useDemoData();
  const { simulatedRole } = useDemoMode();
  const { createAssignment, createMultipleAssignments, updateAssignment } = useAssignments();
  const { employees: dbEmployees } = useEmployees();

  const employees = useDemo
    ? dataEmployees.map(e => ({
        id: e.id,
        fullName: e.name,
        email: e.email,
        workPercentage: 100,
        weeklyHours: 42,
        availability: [],
        isSick: false,
      }))
    : dbEmployees.map(e => ({
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        workPercentage: e.workPercentage,
        weeklyHours: e.weeklyHours,
        availability: e.availability,
        isSick: e.isSick,
      }));

  const [demoAssignments, setDemoAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (useDemo && dataAssignments.length > 0) {
      setDemoAssignments(dataAssignments);
    }
    if (!useDemo) {
      setDemoAssignments([]);
    }
  }, [useDemo, dataAssignments]);

  const assignments = useDemo ? demoAssignments : dataAssignments;

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showTravelSummary, setShowTravelSummary] = useState(false);
  const [travelSummaryMode, setTravelSummaryMode] = useState<'daily' | 'weekly'>('weekly');

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const todayAssignments = assignments.filter(a => isToday(new Date(a.date)));
  const tomorrowAssignments = assignments.filter(a => isTomorrow(new Date(a.date)));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekAssignments = assignments.filter(a =>
    isWithinInterval(new Date(a.date), { start: weekStart, end: weekEnd })
  );

  const handleAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSheetOpen(true);
  };

  const handleNewAssignment = () => {
    setEditingAssignment(null);
    setFormOpen(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setSheetOpen(false);
    setFormOpen(true);
  };

  const handleSaveAssignment = async (data: AssignmentFormValues & { patientName: string; zone: string; assignedEmployeeName?: string }) => {
    if (useDemo) {
      if (editingAssignment) {
        const startTime = data.preferredStartTime;
        const endTime = data.preferredEndTime;
        const durationMinutes = data.durationMinutes;

        setDemoAssignments(prev =>
          prev.map(a =>
            a.id === editingAssignment.id
              ? {
                  ...a,
                  date: data.date,
                  startTime: startTime,
                  endTime: endTime,
                  preferredStartTime: data.preferredStartTime,
                  preferredEndTime: data.preferredEndTime,
                  durationMinutes: durationMinutes,
                  patientId: data.patientId,
                  patientName: data.patientName,
                  type: data.type as AssignmentType,
                  zoneId: data.zoneId,
                  zone: data.zone,
                  assignedEmployeeId: data.assignedEmployeeId,
                  assignedEmployeeName: data.assignedEmployeeName,
                  status: data.status,
                  priority: data.priority,
                  internalNote: data.internalNote,
                  employeeNote: data.employeeNote,
                  updatedAt: new Date(),
                }
              : a
          )
        );
        toast.success('Einsatz wurde aktualisiert');
      } else {
        const startTime = data.preferredStartTime;
        const endTime = data.preferredEndTime;
        const durationMinutes = data.durationMinutes;

        const newAssignments: Assignment[] = [];
        const baseAssignment = {
          patientId: data.patientId,
          patientName: data.patientName,
          type: data.type as AssignmentType,
          zoneId: data.zoneId,
          zone: data.zone,
          assignedEmployeeId: data.assignedEmployeeId,
          assignedEmployeeName: data.assignedEmployeeName,
          status: data.status,
          priority: data.priority,
          internalNote: data.internalNote,
          employeeNote: data.employeeNote,
          startTime: startTime,
          endTime: endTime,
          preferredStartTime: data.preferredStartTime,
          preferredEndTime: data.preferredEndTime,
          durationMinutes: durationMinutes,
        };

        if (data.recurrence === 'none' || !data.recurrenceEndDate) {
          newAssignments.push({
            id: `asg-${Date.now()}`,
            ...baseAssignment,
            date: data.date,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          const seriesId = `series-${Date.now()}`;
          let currentDate = new Date(data.date);
          const endDate = new Date(data.recurrenceEndDate);
          let counter = 0;

          while (currentDate <= endDate && counter < 365) {
            newAssignments.push({
              id: `asg-${Date.now()}-${counter}`,
              ...baseAssignment,
              date: new Date(currentDate),
              seriesId,
              recurrence: data.recurrence as RecurrenceType,
              recurrenceEndDate: data.recurrenceEndDate,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            if (data.recurrence === 'daily') {
              currentDate = addDays(currentDate, 1);
            } else {
              currentDate = addWeeks(currentDate, 1);
            }
            counter++;
          }
        }

        setDemoAssignments(prev => [...prev, ...newAssignments]);
        toast.success(
          newAssignments.length > 1
            ? `${newAssignments.length} Einsätze wurden erstellt`
            : 'Einsatz wurde erstellt'
        );
      }
      return;
    }

    const durationMinutes = data.durationMinutes;
    try {
      if (editingAssignment) {
        await updateAssignment.mutateAsync({
          id: editingAssignment.id,
          data: {
            patient_id: data.patientId,
            assigned_employee_id: data.assignedEmployeeId || null,
            date: format(data.date, 'yyyy-MM-dd'),
            preferred_start_time: data.preferredStartTime,
            preferred_end_time: data.preferredEndTime,
            duration_minutes: durationMinutes,
            start_time: data.preferredStartTime,
            end_time: data.preferredEndTime,
            type: data.type as any,
            zone: data.zone || undefined,
            status: data.status as any,
            priority: data.priority as any,
            internal_note: data.internalNote,
            employee_note: data.employeeNote,
          },
        });
        toast.success('Einsatz wurde gespeichert');
      } else {
        if (data.recurrence === 'none' || !data.recurrenceEndDate) {
          await createAssignment.mutateAsync({
            patient_id: data.patientId,
            assigned_employee_id: data.assignedEmployeeId || null,
            date: format(data.date, 'yyyy-MM-dd'),
            preferred_start_time: data.preferredStartTime,
            preferred_end_time: data.preferredEndTime,
            duration_minutes: durationMinutes,
            start_time: data.preferredStartTime,
            end_time: data.preferredEndTime,
            type: data.type as any,
            zone: data.zone || undefined,
            status: data.status as any,
            priority: data.priority as any,
            internal_note: data.internalNote,
            employee_note: data.employeeNote,
            recurrence: 'none',
          });
          toast.success('Einsatz wurde erstellt');
        } else {
          const assignments = [];
          let currentDate = new Date(data.date);
          const endDate = new Date(data.recurrenceEndDate);
          let counter = 0;

          while (currentDate <= endDate && counter < 365) {
            assignments.push({
              patient_id: data.patientId,
              assigned_employee_id: data.assignedEmployeeId || null,
              date: format(currentDate, 'yyyy-MM-dd'),
              preferred_start_time: data.preferredStartTime,
              preferred_end_time: data.preferredEndTime,
              duration_minutes: durationMinutes,
              start_time: data.preferredStartTime,
              end_time: data.preferredEndTime,
              type: data.type as any,
              zone: data.zone || undefined,
              status: data.status as any,
              priority: data.priority as any,
              internal_note: data.internalNote,
              employee_note: data.employeeNote,
              recurrence: data.recurrence as any,
              recurrence_end_date: format(data.recurrenceEndDate, 'yyyy-MM-dd'),
            });

            if (data.recurrence === 'daily') {
              currentDate = addDays(currentDate, 1);
            } else {
              currentDate = addWeeks(currentDate, 1);
            }
            counter++;
          }

          await createMultipleAssignments.mutateAsync(assignments);
          toast.success(`${assignments.length} Einsätze wurden erstellt`);
        }
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('Fehler beim Speichern des Einsatzes');
    }
  };

  const employeeUtilizations = useEmployeeUtilization(employees, assignments);

  const stats = useMemo(() => {
    const completed = weekAssignments.filter(a => a.status === 'completed').length;
    const urgent = weekAssignments.filter(a => a.priority === 'urgent').length;
    const activeEmployees = new Set(weekAssignments.map(a => a.assignedEmployeeId).filter(Boolean)).size;
    const sickEmployees = employees.filter(e => e.isSick).length;

    return {
      total: weekAssignments.length,
      completed,
      urgent,
      activeEmployees,
      sickEmployees,
      completionRate: weekAssignments.length > 0 ? Math.round((completed / weekAssignments.length) * 100) : 0,
    };
  }, [weekAssignments, employees]);

  const canEdit = !useDemo || simulatedRole !== 'mitarbeiter';
  const showAdminFeatures = hasRole(['admin', 'planer', 'superadmin']) || useDemo;

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
            <AlertDescription className="text-orange-700">
              <strong>Demo-Modus:</strong> Sie sehen die fiktive Organisation "{demoOrgName}" mit Beispieldaten.
              {simulatedRole && <span className="ml-2 text-xs">(Ansicht: {simulatedRole === 'mitarbeiter' ? 'Mitarbeiter' : simulatedRole === 'planer' ? 'Planer' : 'Admin'})</span>}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {useDemo ? `Willkommen bei ${demoOrgName}` : 'Willkommen zurück'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
            </p>
          </div>
          {showAdminFeatures && canEdit && (
            <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={handleNewAssignment}>
              <Plus className="h-4 w-4" />
              Neuer Einsatz
            </Button>
          )}
        </div>

        {showAdminFeatures && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Diese Woche</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Einsätze geplant</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Erledigt</p>
                    <p className="text-3xl font-bold">{stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.completed} von {stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dringend</p>
                    <p className="text-3xl font-bold">{stats.urgent}</p>
                    <p className="text-xs text-muted-foreground mt-1">Einsätze</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mitarbeitende</p>
                    <p className="text-3xl font-bold">{stats.activeEmployees}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">im Einsatz</p>
                      {stats.sickEmployees > 0 && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          {stats.sickEmployees} krank
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showAdminFeatures && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Fahrzeiten</h2>
              <div className="flex items-center ml-4 border rounded-md">
                <Button
                  variant={showTravelSummary && travelSummaryMode === 'weekly' ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 rounded-r-none h-8"
                  onClick={() => {
                    setTravelSummaryMode('weekly');
                    setShowTravelSummary(true);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Woche
                </Button>
                <Button
                  variant={showTravelSummary && travelSummaryMode === 'daily' ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 rounded-l-none border-l h-8"
                  onClick={() => {
                    setTravelSummaryMode('daily');
                    setShowTravelSummary(true);
                  }}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Tag
                </Button>
              </div>
              {showTravelSummary ? (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowTravelSummary(false)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowTravelSummary(true)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Collapsible open={showTravelSummary} onOpenChange={setShowTravelSummary}>
              <CollapsibleContent>
                {travelSummaryMode === 'weekly' ? (
                  <WeeklyTravelSummary
                    assignments={assignments}
                    employees={dataEmployees.map(e => ({ id: e.id, name: e.name }))}
                    weekStart={currentWeekStart}
                    employeeColors={employeeColors}
                  />
                ) : (
                  <DailyTravelSummary
                    assignments={assignments}
                    employees={dataEmployees.map(e => ({ id: e.id, name: e.name }))}
                    selectedDate={new Date()}
                    employeeColors={employeeColors}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {showAdminFeatures && (
            <div className="lg:col-span-1">
              <EmployeeUtilizationCard
                utilizations={employeeUtilizations}
                showExtendedView={true}
              />
            </div>
          )}

          <div className={showAdminFeatures ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Heute</h2>
                  <span className="text-sm text-muted-foreground">({todayAssignments.length} Einsätze)</span>
                </div>
                <div className="space-y-3">
                  {todayAssignments.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      Keine Einsätze für heute geplant
                    </Card>
                  ) : (
                    todayAssignments.map(assignment => (
                      <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        onClick={() => handleAssignmentClick(assignment)}
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Morgen</h2>
                  <span className="text-sm text-muted-foreground">({tomorrowAssignments.length} Einsätze)</span>
                </div>
                <div className="space-y-3">
                  {tomorrowAssignments.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground">
                      Keine Einsätze für morgen geplant
                    </Card>
                  ) : (
                    tomorrowAssignments.map(assignment => (
                      <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        onClick={() => handleAssignmentClick(assignment)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <AssignmentDetailSheet
          assignment={selectedAssignment}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onEdit={canEdit ? handleEditAssignment : undefined}
        />

        <AssignmentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          assignment={editingAssignment}
          initialDate={new Date()}
          onSave={handleSaveAssignment}
        />
      </div>
    </AppLayout>
  );
}
