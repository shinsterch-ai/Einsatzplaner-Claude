'use client'

import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Assignment, AssignmentType, AssignmentStatus } from '@/types';
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Users, Calendar, ClipboardList, Info, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';

const demoEmployees = [
  { id: 'demo-emp-1', name: 'Maria Müller', color: 'bg-blue-500' },
  { id: 'demo-emp-2', name: 'Thomas Schmidt', color: 'bg-green-500' },
  { id: 'demo-emp-3', name: 'Anna Weber', color: 'bg-purple-500' },
  { id: 'demo-emp-4', name: 'Stefan Keller', color: 'bg-orange-500' },
];

const demoPatients = [
  { id: 'demo-pat-1', full_name: 'Frau Müller', city: 'Zürich' },
  { id: 'demo-pat-2', full_name: 'Herr Schmidt', city: 'Winterthur' },
  { id: 'demo-pat-3', full_name: 'Frau Weber', city: 'Zürich' },
  { id: 'demo-pat-4', full_name: 'Herr Keller', city: 'Dietikon' },
  { id: 'demo-pat-5', full_name: 'Frau Brunner', city: 'Uster' },
];

function generateDemoAssignments(): Assignment[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const assignments: Assignment[] = [];
  const types: AssignmentType[] = ['grundpflege', 'behandlungspflege', 'haushalt', 'abklaerung'];
  const statuses: AssignmentStatus[] = ['planned', 'confirmed', 'in-progress', 'completed'];
  const morningSlots = [{ start: '07:00', end: '08:00' }, { start: '08:15', end: '09:15' }, { start: '09:30', end: '10:30' }, { start: '10:45', end: '11:45' }];
  const afternoonSlots = [{ start: '13:00', end: '14:00' }, { start: '14:15', end: '15:15' }, { start: '15:30', end: '16:30' }, { start: '16:45', end: '17:45' }];
  let id = 1;
  for (let day = 0; day < 5; day++) {
    const date = addDays(weekStart, day);
    const isPast = date < new Date();
    demoEmployees.forEach((employee, empIndex) => {
      const numAssignments = 3 + (day % 2);
      const slots = [...morningSlots, ...afternoonSlots].slice(0, numAssignments);
      slots.forEach((slot, slotIndex) => {
        const patient = demoPatients[(empIndex + slotIndex + day) % demoPatients.length];
        const type = types[(empIndex + slotIndex) % types.length];
        let status: AssignmentStatus = 'planned';
        if (isPast) { status = 'completed'; }
        else if (isToday(date)) { status = slotIndex < 2 ? 'completed' : slotIndex === 2 ? 'in-progress' : 'confirmed'; }
        else { status = statuses[slotIndex % 2]; }
        assignments.push({
          id: `demo-${id++}`, date, startTime: slot.start, endTime: slot.end,
          patientName: patient.full_name, patientId: patient.id, type, zone: patient.city,
          zoneId: `zone-${patient.city.toLowerCase()}`, assignedEmployeeId: employee.id,
          assignedEmployeeName: employee.name, status, priority: (id % 7 === 0) ? 'urgent' : 'normal',
          internalNote: slotIndex === 0 ? 'Schlüssel beim Hausmeister' : undefined,
          employeeNote: slotIndex === 1 ? 'Türcode: 1234' : undefined,
          createdAt: new Date(), updatedAt: new Date(),
        });
      });
    });
  }
  return assignments;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function DemoSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string | 'all'>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [dropTarget, setDropTarget] = useState<{ employeeId: string; date: Date } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>(() => generateDemoAssignments());

  const handleDragStart = useCallback((e: React.DragEvent, assignment: Assignment) => {
    setDraggedAssignment(assignment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', assignment.id);
  }, []);

  const handleDragEnd = useCallback(() => { setDraggedAssignment(null); setDropTarget(null); }, []);

  const handleDragOver = useCallback((e: React.DragEvent, employeeId: string, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ employeeId, date });
  }, []);

  const handleDragLeave = useCallback(() => { setDropTarget(null); }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetEmployeeId: string, targetDate: Date) => {
    e.preventDefault();
    if (!draggedAssignment) return;
    const employee = demoEmployees.find(emp => emp.id === targetEmployeeId);
    if (!employee) return;
    if (draggedAssignment.assignedEmployeeId === targetEmployeeId && isSameDay(new Date(draggedAssignment.date), targetDate)) {
      setDraggedAssignment(null); setDropTarget(null); return;
    }
    setAssignments(prev => prev.map(a => a.id === draggedAssignment.id
      ? { ...a, assignedEmployeeId: targetEmployeeId, assignedEmployeeName: employee.name, date: targetDate, updatedAt: new Date() }
      : a
    ));
    toast.success('Einsatz verschoben', { description: `${draggedAssignment.patientName} wurde zu ${employee.name} verschoben.` });
    setDraggedAssignment(null); setDropTarget(null);
  }, [draggedAssignment]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAssignments = useMemo(() => {
    if (selectedEmployee === 'all') return assignments;
    return assignments.filter(a => a.assignedEmployeeId === selectedEmployee);
  }, [assignments, selectedEmployee]);

  const stats = useMemo(() => ({
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    urgent: assignments.filter(a => a.priority === 'urgent').length,
  }), [assignments]);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Demo-Modus mit Drag & Drop</AlertTitle>
            <AlertDescription>Dies ist ein Beispieleinsatzplan mit generierten Daten für Test- und Vorführzwecke. Ziehen Sie Einsätze per Drag & Drop zu anderen Mitarbeitern oder Tagen. Die Daten werden nicht gespeichert.</AlertDescription>
          </Alert>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Beispieleinsatzplan</h1>
            <p className="text-muted-foreground mt-1">Wochenansicht mit {demoEmployees.length} Mitarbeitern und {demoPatients.length} Patienten</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><ClipboardList className="h-4 w-4 inline mr-2" />Einsätze gesamt</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><Calendar className="h-4 w-4 inline mr-2" />Erledigt</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.completed}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dringend</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-600">{stats.urgent}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground"><Users className="h-4 w-4 inline mr-2" />Mitarbeiter</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{demoEmployees.length}</p></CardContent></Card>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center">{format(weekStart, "'KW' w, MMMM yyyy", { locale: de })}</h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Heute</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Mitarbeiter:</span>
            <Button variant={selectedEmployee === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedEmployee('all')}>Alle</Button>
            {demoEmployees.map(emp => (
              <Button key={emp.id} variant={selectedEmployee === emp.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedEmployee(emp.id)} className="gap-2">
                <span className={cn('w-3 h-3 rounded-full', emp.color)} />{emp.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 bg-muted">
            <div className="p-3 font-medium border-r">Mitarbeiter</div>
            {weekDays.map((day, idx) => (
              <div key={idx} className={cn('text-center py-2 font-medium border-r last:border-r-0', isToday(day) && 'bg-primary text-primary-foreground')}>
                <div className="text-xs uppercase">{DAYS[idx]}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          {demoEmployees.map(employee => (
            <div key={employee.id} className="grid grid-cols-8 border-t">
              <div className="p-3 border-r bg-muted/50 flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-full flex-shrink-0', employee.color)} />
                <span className="font-medium text-sm truncate">{employee.name}</span>
              </div>
              {weekDays.map((day, dayIdx) => {
                const dayAssignments = filteredAssignments.filter(a => a.assignedEmployeeId === employee.id && isSameDay(new Date(a.date), day)).sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isDropTargetHere = dropTarget?.employeeId === employee.id && isSameDay(dropTarget.date, day);
                return (
                  <div key={dayIdx} className={cn('p-1 border-r last:border-r-0 min-h-[120px] transition-colors', isDropTargetHere && 'bg-primary/10 ring-2 ring-primary ring-inset', draggedAssignment && 'bg-muted/30')}
                    onDragOver={(e) => handleDragOver(e, employee.id, day)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, employee.id, day)}>
                    <div className="space-y-1">
                      {dayAssignments.map(assignment => (
                        <div key={assignment.id} draggable onDragStart={(e) => handleDragStart(e, assignment)} onDragEnd={handleDragEnd} className={cn('relative group cursor-grab active:cursor-grabbing', draggedAssignment?.id === assignment.id && 'opacity-50')}>
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l bg-current opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <GripVertical className="h-3 w-3 text-muted-foreground -ml-1" />
                          </div>
                          <AssignmentCard assignment={assignment} onClick={() => { if (!draggedAssignment) { setSelectedAssignment(assignment); setSheetOpen(true); } }} compact />
                        </div>
                      ))}
                      {dayAssignments.length === 0 && !isDropTargetHere && <p className="text-xs text-muted-foreground text-center py-2">—</p>}
                      {isDropTargetHere && <div className="border-2 border-dashed border-primary rounded p-2 text-center text-xs text-primary">Hier ablegen</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground">Legende:</span>
          {demoEmployees.map(emp => (
            <div key={emp.id} className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', emp.color)} />
              <span className="text-sm">{emp.name}</span>
            </div>
          ))}
        </div>

        <AssignmentDetailSheet assignment={selectedAssignment} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    </AppLayout>
  );
}
