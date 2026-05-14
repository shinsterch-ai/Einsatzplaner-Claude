'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmployeeWizard, EmployeeWizardData } from '@/components/employees/EmployeeWizard';
import { Plus, Search, Edit, Trash2, Mail, Percent } from 'lucide-react';
import { SickLeavePopover } from '@/components/employees/SickLeavePopover';
import { SickLeaveData } from '@/components/employees/SickLeaveToggle';
import { toast } from 'sonner';
import { Database } from '@/lib/supabase/types';
import { ASSIGNMENT_TYPES } from '@/hooks/use-employee-qualifications';
import {
  useEmployees,
  calculateWeeklyHours,
  calculateAvailableHoursFromSchedule,
} from '@/hooks/use-employees';
import { useWorktimeSettings } from '@/hooks/use-worktime-settings';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useDemoData } from '@/hooks/use-demo-data';
import { mockUsers } from '@/data/mockData';
import { DayAvailability, getDefaultAvailability } from '@/components/employees/AvailabilitySchedule';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

type AssignmentType = Database['public']['Enums']['assignment_type'];

interface PageEmployee {
  id: string;
  fullName: string | null;
  email: string;
  phone?: string | null;
  isActive: boolean;
  workPercentage: number | null;
  weeklyHours: number | null;
  createdAt: string;
  qualifications: AssignmentType[];
  availability: DayAvailability[];
  roles?: ('mitarbeiter' | 'planer' | 'admin')[];
  isSick?: boolean;
  sickSince?: string | null;
  sickUntil?: string | null;
  sickNote?: string | null;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function EmployeesPage() {
  const { isDemoMode } = useDemoMode();
  const { employees: dbEmployees, isLoading, updateEmployee, updateSickStatus, deleteEmployee, refetch } = useEmployees();
  const { assignments: demoAssignments, employees: demoDataEmployees } = useDemoData();
  const { data: worktimeSettings } = useWorktimeSettings();
  const baseWeeklyHours = worktimeSettings?.weekly_hours_base ?? 40;

  const [demoEmployeesList, setDemoEmployeesList] = useState<PageEmployee[]>(() =>
    mockUsers.filter(u => u.role === 'employee').map(u => ({
      id: u.id,
      fullName: u.name,
      email: u.email,
      isActive: u.isActive,
      workPercentage: 100,
      weeklyHours: 42,
      createdAt: u.createdAt.toISOString(),
      qualifications: ASSIGNMENT_TYPES.map(t => t.value),
      availability: getDefaultAvailability(),
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingEmployee, setEditingEmployee] = useState<PageEmployee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<PageEmployee | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const employees: PageEmployee[] = isDemoMode
    ? demoEmployeesList
    : dbEmployees.map(e => ({
        id: e.id,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        isActive: e.isActive,
        workPercentage: e.workPercentage,
        weeklyHours: e.weeklyHours,
        createdAt: e.createdAt,
        qualifications: e.qualifications,
        availability: e.availability,
        roles: e.roles,
        isSick: e.isSick,
        sickSince: e.sickSince,
        sickUntil: e.sickUntil,
        sickNote: e.sickNote,
      }));

  const filteredEmployees = employees.filter((employee) => {
    const name = employee.fullName || '';
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setViewMode('create');
  };

  const handleEditEmployee = (employee: PageEmployee) => {
    setEditingEmployee(employee);
    setViewMode('edit');
  };

  const handleDeleteClick = (employee: PageEmployee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (employeeToDelete) {
      const name = employeeToDelete.fullName || employeeToDelete.email;
      if (isDemoMode) {
        setDemoEmployeesList((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
        toast.success(`${name} wurde entfernt`);
      } else {
        try {
          await deleteEmployee.mutateAsync(employeeToDelete.id);
        } catch (error) {}
      }
      setEmployeeToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSaveEmployee = async (data: EmployeeWizardData) => {
    setIsSaving(true);
    try {
      if (isDemoMode) {
        if (editingEmployee) {
          setDemoEmployeesList((prev) =>
            prev.map((e) =>
              e.id === editingEmployee.id
                ? {
                    ...e,
                    fullName: data.name,
                    email: data.email,
                    phone: data.phone,
                    isActive: data.isActive,
                    workPercentage: data.workPercentage,
                    weeklyHours: calculateWeeklyHours(data.workPercentage, baseWeeklyHours),
                    qualifications: data.qualifications,
                    availability: data.availability,
                    isSick: data.sickLeave.isSick,
                    sickSince: data.sickLeave.sickSince,
                    sickUntil: data.sickLeave.sickUntil,
                    sickNote: data.sickLeave.sickNote,
                  }
                : e
            )
          );
          toast.success(`${data.name} wurde aktualisiert`);
        } else {
          const newEmployee: PageEmployee = {
            id: `user-${Date.now()}`,
            fullName: data.name,
            email: data.email,
            phone: data.phone,
            isActive: data.isActive,
            workPercentage: data.workPercentage,
            weeklyHours: calculateWeeklyHours(data.workPercentage, baseWeeklyHours),
            createdAt: new Date().toISOString(),
            qualifications: data.qualifications,
            availability: data.availability,
          };
          setDemoEmployeesList((prev) => [...prev, newEmployee]);
          toast.success(`${data.name} wurde hinzugefügt`);
        }
      } else {
        if (editingEmployee) {
          await updateEmployee.mutateAsync({
            employeeId: editingEmployee.id,
            data: {
              name: data.name,
              email: data.email,
              workPercentage: data.workPercentage,
              isActive: data.isActive,
              qualifications: data.qualifications,
              availability: data.availability,
            },
          });
          await updateSickStatus.mutateAsync({
            employeeId: editingEmployee.id,
            isSick: data.sickLeave.isSick,
            sickSince: data.sickLeave.sickSince,
            sickUntil: data.sickLeave.sickUntil,
            sickNote: data.sickLeave.sickNote,
          });
        } else {
          if (!data.password) {
            toast.error('Passwort ist erforderlich');
            setIsSaving(false);
            return;
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error('Nicht angemeldet');
            setIsSaving(false);
            return;
          }
          const response = await supabase.functions.invoke('create-employee', {
            body: {
              email: data.email,
              password: data.password,
              fullName: data.name,
              phone: data.phone,
              qualifications: data.qualifications,
              workPercentage: data.workPercentage,
              role: data.role,
              availability: data.availability.map(a => ({
                dayOfWeek: a.dayOfWeek,
                isAvailable: a.isAvailable,
                startTime: a.startTime,
                endTime: a.endTime,
                weekPattern: a.weekPattern,
              })),
            },
          });
          if (response.error) {
            toast.error(response.error.message || 'Fehler beim Erstellen');
            setIsSaving(false);
            return;
          }
          if (response.data?.error) {
            toast.error(response.data.error);
            setIsSaving(false);
            return;
          }
          toast.success(`${data.name} wurde erstellt`);
          await refetch();
        }
      }
      setViewMode('list');
      setEditingEmployee(null);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingEmployee(null);
  };

  const handleSickStatusChange = async (employeeId: string, data: SickLeaveData) => {
    if (isDemoMode) {
      setDemoEmployeesList((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? { ...e, isSick: data.isSick, sickSince: data.sickSince, sickUntil: data.sickUntil, sickNote: data.sickNote }
            : e
        )
      );
      toast.success('Krankmeldung aktualisiert');
    } else {
      await updateSickStatus.mutateAsync({
        employeeId,
        isSick: data.isSick,
        sickSince: data.sickSince,
        sickUntil: data.sickUntil,
        sickNote: data.sickNote,
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getEmployeeName = (employee: PageEmployee) => employee.fullName || employee.email;

  const getQualificationBadges = (qualifications?: AssignmentType[]) => {
    if (!qualifications || qualifications.length === 0) return <span className="text-xs text-muted-foreground italic">Keine</span>;
    if (qualifications.length === ASSIGNMENT_TYPES.length) return <Badge variant="secondary" className="text-xs">Alle</Badge>;
    return (
      <div className="flex flex-wrap gap-1">
        {qualifications.slice(0, 2).map(q => {
          const type = ASSIGNMENT_TYPES.find(t => t.value === q);
          return <Badge key={q} variant="outline" className="text-xs">{type?.label.slice(0, 3)}</Badge>;
        })}
        {qualifications.length > 2 && <Badge variant="outline" className="text-xs">+{qualifications.length - 2}</Badge>}
      </div>
    );
  };

  const getUtilizationInfo = (employee: PageEmployee) => {
    const workPercentage = employee.workPercentage || 100;
    const weeklyHours = employee.weeklyHours || calculateWeeklyHours(workPercentage, baseWeeklyHours);
    const availability = employee.availability || [];
    const availableHours = calculateAvailableHoursFromSchedule(availability);
    const utilization = availableHours > 0 ? Math.round((weeklyHours / availableHours) * 100) : 0;
    return { weeklyHours, availableHours, utilization };
  };

  const getEmployeeRole = (roles?: ('mitarbeiter' | 'planer' | 'admin')[]): 'mitarbeiter' | 'planer' => {
    if (!roles || roles.length === 0) return 'mitarbeiter';
    if (roles.includes('planer')) return 'planer';
    return 'mitarbeiter';
  };

  if (viewMode !== 'list') {
    const editData = editingEmployee ? {
      name: editingEmployee.fullName || '',
      email: editingEmployee.email,
      phone: editingEmployee.phone || '',
      role: getEmployeeRole(editingEmployee.roles),
      isActive: editingEmployee.isActive,
      workPercentage: editingEmployee.workPercentage || 100,
      qualifications: editingEmployee.qualifications || [],
      availability: editingEmployee.availability || getDefaultAvailability(),
      sickLeave: {
        isSick: editingEmployee.isSick ?? false,
        sickSince: editingEmployee.sickSince ?? null,
        sickUntil: editingEmployee.sickUntil ?? null,
        sickNote: editingEmployee.sickNote ?? null,
      },
    } : undefined;

    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <EmployeeWizard onSave={handleSaveEmployee} onCancel={handleCancel} isEditing={viewMode === 'edit'} initialData={editData} isSaving={isSaving} />
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !isDemoMode) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Card><CardContent className="p-6"><div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div></CardContent></Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Mitarbeiter</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Verwalten Sie das Pflegepersonal</p>
          </div>
          <Button onClick={handleAddEmployee} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />Neuer Mitarbeiter
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Mitarbeiterliste</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Anstellung</TableHead>
                    <TableHead>Qualifikationen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Krank</TableHead>
                    <TableHead className="w-24">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Keine Mitarbeiter gefunden</TableCell></TableRow>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const name = getEmployeeName(employee);
                      const { weeklyHours, utilization } = getUtilizationInfo(employee);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(name)}</AvatarFallback></Avatar>
                              <span className="font-medium">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell><div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{employee.email}</div></TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm"><Percent className="h-3.5 w-3.5 text-muted-foreground" /><span>{employee.workPercentage || 100}%</span><span className="text-muted-foreground">({weeklyHours}h)</span></div>
                              <div className="flex items-center gap-2">
                                <Progress value={Math.min(utilization, 100)} className={`h-1.5 w-16 ${utilization > 100 ? '[&>div]:bg-destructive' : utilization > 80 ? '[&>div]:bg-amber-500' : ''}`} />
                                <span className={`text-xs ${utilization > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>{utilization}%</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getQualificationBadges(employee.qualifications)}</TableCell>
                          <TableCell><Badge variant={employee.isActive ? 'default' : 'secondary'}>{employee.isActive ? 'Aktiv' : 'Inaktiv'}</Badge></TableCell>
                          <TableCell>
                            <SickLeavePopover employeeId={employee.id} employeeName={getEmployeeName(employee)} isSick={employee.isSick ?? false} sickSince={employee.sickSince ?? null} sickUntil={employee.sickUntil ?? null} sickNote={employee.sickNote ?? null} onSave={(data) => handleSickStatusChange(employee.id, data)} useDemo={isDemoMode} demoAssignments={demoAssignments} demoEmployees={demoDataEmployees} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(employee)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {filteredEmployees.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 px-4">Keine Mitarbeiter gefunden</div>
              ) : (
                filteredEmployees.map((employee) => {
                  const name = getEmployeeName(employee);
                  const { weeklyHours, utilization } = getUtilizationInfo(employee);
                  return (
                    <div key={employee.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(name)}</AvatarFallback></Avatar>
                          <div><p className="font-medium">{name}</p><p className="text-sm text-muted-foreground">{employee.email}</p></div>
                        </div>
                        <Badge variant={employee.isActive ? 'default' : 'secondary'}>{employee.isActive ? 'Aktiv' : 'Inaktiv'}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1"><Percent className="h-3.5 w-3.5 text-muted-foreground" /><span>{employee.workPercentage || 100}% ({weeklyHours}h)</span></div>
                        <div className="flex items-center gap-2"><Progress value={Math.min(utilization, 100)} className="h-1.5 w-12" /><span className="text-xs text-muted-foreground">{utilization}%</span></div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        {getQualificationBadges(employee.qualifications)}
                        <div className="flex items-center gap-1">
                          <SickLeavePopover employeeId={employee.id} employeeName={getEmployeeName(employee)} isSick={employee.isSick ?? false} sickSince={employee.sickSince ?? null} sickUntil={employee.sickUntil ?? null} sickNote={employee.sickNote ?? null} onSave={(data) => handleSickStatusChange(employee.id, data)} useDemo={isDemoMode} demoAssignments={demoAssignments} demoEmployees={demoDataEmployees} />
                          <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(employee)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mitarbeiter entfernen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie <strong>{employeeToDelete ? getEmployeeName(employeeToDelete) : ''}</strong> wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Entfernen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
