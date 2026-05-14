import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { TimeInput } from '@/components/ui/time-input';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, AlertTriangle, Repeat, Clock, Sparkles, Loader2 } from 'lucide-react';
import {
  Assignment,
  AssignmentType,
  AssignmentStatus,
  Priority,
  RecurrenceType,
  ASSIGNMENT_TYPE_LABELS,
  STATUS_LABELS,
  RECURRENCE_LABELS,
  WEEKDAY_LABELS,
} from '@/types';
import { mockPatients } from '@/data/mockData';
import { demoPatients } from '@/data/demoOrgData';
import { usePatients } from '@/hooks/use-patients';
import { useAssignments } from '@/hooks/use-assignments';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoData, UserWithQualifications } from '@/hooks/use-demo-data';
import { useAutoAssign } from '@/hooks/use-auto-assign';
import { ConflictWarning } from './ConflictWarning';
import { QualificationWarning, EmployeeQualificationBadges } from './QualificationWarning';
import { SickEmployeeWarning } from './SickEmployeeWarning';
import { AvailabilityWarning } from './AvailabilityWarning';
import { TravelTimeWarning } from './TravelTimeWarning';

// Duration constraints
const MIN_DURATION = 15;
const MAX_DURATION = 480;

// Validation schema - updated for preferred time window + duration
const assignmentSchema = z.object({
  date: z.date({
    message: 'Datum ist erforderlich',
  }),
  preferredStartTime: z.string().min(1, 'Startzeit ist erforderlich').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (HH:mm)'),
  preferredEndTime: z.string().min(1, 'Endzeit ist erforderlich').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (HH:mm)'),
  durationMinutes: z.number().min(15, 'Mindestens 15 Minuten').max(480, 'Maximal 8 Stunden'),
  patientId: z.string().min(1, 'Patient ist erforderlich'),
  type: z.enum(['grundpflege', 'behandlungspflege', 'abklaerung', 'haushalt', 'privatleistungen'], {
    message: 'Einsatzart ist erforderlich',
  }),
  zoneId: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
  responsiblePersonId: z.string().optional(), // Fallführend - person responsible for the case
  status: z.enum(['draft', 'planned', 'confirmed', 'in-progress', 'completed', 'cancelled']),
  priority: z.enum(['normal', 'urgent']),
  recurrence: z.enum(['none', 'daily', 'weekly', 'custom']),
  recurrenceEndDate: z.date().optional(),
  recurrenceDays: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 1 = Monday, etc.
  internalNote: z.string().max(500, 'Maximale Länge: 500 Zeichen').optional(),
  employeeNote: z.string().max(500, 'Maximale Länge: 500 Zeichen').optional(),
}).refine((data) => {
  const start = data.preferredStartTime.split(':').map(Number);
  const end = data.preferredEndTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return endMinutes > startMinutes;
}, {
  message: 'Endzeit muss nach Startzeit liegen',
  path: ['preferredEndTime'],
}).refine((data) => {
  // Check that duration fits within the time window
  const start = data.preferredStartTime.split(':').map(Number);
  const end = data.preferredEndTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  const windowMinutes = endMinutes - startMinutes;
  return data.durationMinutes <= windowMinutes;
}, {
  message: 'Dauer passt nicht ins Zeitfenster',
  path: ['durationMinutes'],
}).refine((data) => {
  if (data.recurrence !== 'none' && !data.recurrenceEndDate) {
    return false;
  }
  return true;
}, {
  message: 'Enddatum für Wiederholung ist erforderlich',
  path: ['recurrenceEndDate'],
}).refine((data) => {
  // For custom recurrence, at least one day must be selected
  if (data.recurrence === 'custom' && (!data.recurrenceDays || data.recurrenceDays.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Mindestens ein Wochentag muss ausgewählt werden',
  path: ['recurrenceDays'],
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Assignment | null;
  initialDate?: Date;
  onSave: (data: AssignmentFormValues & { patientName: string; zone: string; assignedEmployeeName?: string; responsiblePersonName?: string }) => void;
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  assignment,
  initialDate,
  onSave,
}: AssignmentFormDialogProps) {
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [recurrenceEndPickerOpen, setRecurrenceEndPickerOpen] = useState(false);
  const [hasTravelTimeConflict, setHasTravelTimeConflict] = useState(false);
  const [autoAssignTriggered, setAutoAssignTriggered] = useState(false);
  
  const { isSuperadmin } = useAuth();
  const { isDemoMode } = useDemoMode();
  const isDemo = isSuperadmin && isDemoMode;
  
  // Auto-assign hook
  const { autoAssign, isAssigning } = useAutoAssign();
  
  // Use real patients from database or demo data in demo mode
  const { patients: dbPatients } = usePatients();
  const { assignments: dbAssignments } = useAssignments();
  
  // Use demoPatients in demo mode, otherwise use DB patients
  const patients = isDemo 
    ? demoPatients.map(p => ({
        id: p.id,
        full_name: p.full_name,
        city: p.city || undefined,
        address: undefined as string | undefined,
        notes: p.notes || undefined,
      }))
    : dbPatients.map(p => ({
        id: p.id,
        full_name: p.full_name,
        city: p.city || undefined,
        address: p.address || undefined,
        notes: p.notes || undefined,
      }));
  
  const isEditing = !!assignment;
  
  const { employees } = useDemoData();
  
  // Helper to calculate duration from start/end times
  const calculateDuration = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: assignment
      ? {
          date: new Date(assignment.date),
          preferredStartTime: assignment.preferredStartTime || assignment.startTime,
          preferredEndTime: assignment.preferredEndTime || assignment.endTime,
          durationMinutes: assignment.durationMinutes || calculateDuration(assignment.startTime, assignment.endTime),
          patientId: assignment.patientId,
          type: assignment.type,
          zoneId: assignment.zoneId,
          assignedEmployeeId: assignment.assignedEmployeeId || '',
          responsiblePersonId: (assignment as any).responsiblePersonId || '',
          status: assignment.status,
          priority: assignment.priority,
          recurrence: assignment.recurrence || 'none',
          recurrenceEndDate: assignment.recurrenceEndDate ? new Date(assignment.recurrenceEndDate) : undefined,
          recurrenceDays: [] as number[],
          internalNote: assignment.internalNote || '',
          employeeNote: assignment.employeeNote || '',
        }
      : {
          date: initialDate || new Date(),
          preferredStartTime: '08:00',
          preferredEndTime: '10:00',
          durationMinutes: 60,
          patientId: '',
          type: 'grundpflege' as AssignmentType,
          zoneId: '',
          assignedEmployeeId: '',
          responsiblePersonId: '',
          status: 'draft' as AssignmentStatus,
          priority: 'normal' as Priority,
          recurrence: 'none' as RecurrenceType,
          recurrenceEndDate: undefined,
          recurrenceDays: [] as number[],
          internalNote: '',
          employeeNote: '',
        },
  });

  // Reset form when dialog opens/closes or assignment changes
  useEffect(() => {
    if (open) {
      if (assignment) {
        form.reset({
          date: new Date(assignment.date),
          preferredStartTime: assignment.preferredStartTime || assignment.startTime,
          preferredEndTime: assignment.preferredEndTime || assignment.endTime,
          durationMinutes: assignment.durationMinutes || calculateDuration(assignment.startTime, assignment.endTime),
          patientId: assignment.patientId,
          type: assignment.type,
          zoneId: assignment.zoneId,
          assignedEmployeeId: assignment.assignedEmployeeId || '',
          responsiblePersonId: (assignment as any).responsiblePersonId || '',
          status: assignment.status,
          priority: assignment.priority,
          recurrence: assignment.recurrence || 'none',
          recurrenceEndDate: assignment.recurrenceEndDate ? new Date(assignment.recurrenceEndDate) : undefined,
          recurrenceDays: [],
          internalNote: assignment.internalNote || '',
          employeeNote: assignment.employeeNote || '',
        });
      } else {
        form.reset({
          date: initialDate || new Date(),
          preferredStartTime: '08:00',
          preferredEndTime: '10:00',
          durationMinutes: 60,
          patientId: '',
          type: 'grundpflege',
          zoneId: '',
          assignedEmployeeId: '',
          responsiblePersonId: '',
          status: 'draft',
          priority: 'normal',
          recurrence: 'none',
          recurrenceDays: [],
          recurrenceEndDate: undefined,
          internalNote: '',
          employeeNote: '',
        });
      }
    }
  }, [open, assignment, initialDate, form]);

  // Auto-fill zone when patient is selected
  const selectedPatientId = form.watch('patientId');
  const selectedRecurrence = form.watch('recurrence');
  const selectedDate = form.watch('date');
  const selectedEmployeeId = form.watch('assignedEmployeeId');
  const selectedStartTime = form.watch('preferredStartTime');
  const selectedEndTime = form.watch('preferredEndTime');
  const selectedDuration = form.watch('durationMinutes');
  const selectedType = form.watch('type');

  // Calculate max duration based on time window
  const maxDurationForWindow = useMemo(() => {
    const start = selectedStartTime?.split(':').map(Number) || [8, 0];
    const end = selectedEndTime?.split(':').map(Number) || [10, 0];
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    const windowMinutes = endMinutes - startMinutes;
    
    return windowMinutes > 0 ? windowMinutes : MIN_DURATION;
  }, [selectedStartTime, selectedEndTime]);

  // Auto-adjust duration if it exceeds the window
  useEffect(() => {
    if (selectedDuration && selectedDuration > maxDurationForWindow) {
      form.setValue('durationMinutes', maxDurationForWindow);
    }
  }, [maxDurationForWindow, selectedDuration, form]);
  
  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId),
    [selectedPatientId, patients]
  );

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId),
    [selectedEmployeeId, employees]
  );

  // Auto-set zone from patient city (used internally, not shown in form)
  useEffect(() => {
    if (selectedPatient && selectedPatient.city) {
      form.setValue('zoneId', selectedPatient.city);
    }
  }, [selectedPatient, form]);

  // Auto-set recurrence end date when recurrence type changes
  useEffect(() => {
    if (selectedRecurrence !== 'none' && !form.getValues('recurrenceEndDate')) {
      const endDate = selectedRecurrence === 'daily' 
        ? addDays(selectedDate, 7) 
        : addWeeks(selectedDate, 4);
      form.setValue('recurrenceEndDate', endDate);
    }
  }, [selectedRecurrence, selectedDate, form]);

  // Auto-assign employee when all required fields are set (only for new assignments)
  const triggerAutoAssign = useCallback(async () => {
    if (isEditing || isDemo || isAssigning || autoAssignTriggered) return;
    if (!selectedPatientId || !selectedDate || !selectedStartTime || !selectedEndTime || !selectedType) return;
    if (selectedEmployeeId) return; // Already has an employee assigned
    
    setAutoAssignTriggered(true);
    
    const result = await autoAssign({
      date: format(selectedDate, 'yyyy-MM-dd'),
      preferred_start_time: selectedStartTime,
      preferred_end_time: selectedEndTime,
      duration_minutes: selectedDuration || 60,
      type: selectedType,
      patient_id: selectedPatientId,
      zone: selectedPatient?.city,
    });

    if (result?.success && result.assigned_employee_id) {
      form.setValue('assignedEmployeeId', result.assigned_employee_id);
      // Also update times if the system found a better slot
      if (result.scheduled_start_time && result.scheduled_end_time) {
        form.setValue('preferredStartTime', result.scheduled_start_time);
        form.setValue('preferredEndTime', result.scheduled_end_time);
      }
    }
  }, [
    isEditing, isDemo, isAssigning, autoAssignTriggered,
    selectedPatientId, selectedDate, selectedStartTime, selectedEndTime, 
    selectedType, selectedEmployeeId, selectedDuration, selectedPatient,
    autoAssign, form
  ]);

  // Trigger auto-assign when patient is selected (main trigger)
  useEffect(() => {
    if (!isEditing && selectedPatientId && !selectedEmployeeId && !autoAssignTriggered) {
      triggerAutoAssign();
    }
  }, [selectedPatientId, isEditing, selectedEmployeeId, autoAssignTriggered, triggerAutoAssign]);

  // Reset auto-assign trigger when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAutoAssignTriggered(false);
    }
  }, [open]);

  const handleSubmit = (values: AssignmentFormValues) => {
    const patient = patients.find(p => p.id === values.patientId);
    const employee = employees.find(e => e.id === values.assignedEmployeeId);
    const responsiblePerson = employees.find(e => e.id === values.responsiblePersonId);
    
    onSave({
      ...values,
      patientName: patient?.full_name || '',
      zone: patient?.city || values.zoneId || '',
      assignedEmployeeName: employee?.name,
      responsiblePersonName: responsiblePerson?.name,
    });
    
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Travel Time Warning - shown at top as blocking issue */}
            <TravelTimeWarning
              selectedEmployeeId={selectedEmployeeId}
              selectedDate={selectedDate}
              startTime={selectedStartTime}
              endTime={selectedEndTime}
              patientAddress={selectedPatient?.address ? `${selectedPatient.address}, ${selectedPatient.city || 'Schweiz'}` : undefined}
              existingAssignments={dbAssignments.map(a => ({
                id: a.id,
                date: a.date,
                startTime: a.start_time,
                endTime: a.end_time,
                patientName: a.patient?.full_name || '',
                patientId: a.patient_id,
                patientAddress: a.patient?.address ? `${a.patient.address}, ${a.patient.city || 'Schweiz'}` : undefined,
                type: a.type,
                zone: a.zone || '',
                zoneId: a.zone || '',
                assignedEmployeeId: a.assigned_employee_id || undefined,
                assignedEmployeeName: a.assigned_employee?.full_name || undefined,
                status: a.status.replace('_', '-') as any,
                priority: a.priority,
                createdAt: new Date(a.created_at),
                updatedAt: new Date(a.updated_at),
              }))}
              currentAssignmentId={assignment?.id}
              onConflictChange={setHasTravelTimeConflict}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum *</FormLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'EEEE, dd.MM.yyyy', { locale: de })
                          ) : (
                            <span>Datum wählen</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setDatePickerOpen(false);
                        }}
                        locale={de}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Window & Duration */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Wunschzeitfenster & Dauer</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="preferredStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Von *</FormLabel>
                      <FormControl>
                        <TimeInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="08:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferredEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bis *</FormLabel>
                      <FormControl>
                        <TimeInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="10:00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dauer (Min.) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={MIN_DURATION}
                            max={Math.min(MAX_DURATION, maxDurationForWindow)}
                            step={5}
                            className="pr-12"
                            value={field.value || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              field.onChange(isNaN(val) ? MIN_DURATION : val);
                            }}
                            placeholder="60"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Min.
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormDescription className="text-xs">
                Der Einsatz wird innerhalb des Zeitfensters eingeplant. Die effektive Startzeit wird bei der automatischen Zuordnung berechnet.
              </FormDescription>
            </div>

            {/* Patient Search */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient (Kürzel) *</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value
                            ? (patients.find(p => p.id === field.value)?.full_name || 'Unbenannt')
                            : 'Klient suchen...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Name eingeben..." />
                          <CommandList>
                          <CommandEmpty>Kein Klient gefunden.</CommandEmpty>
                          <CommandGroup>
                            {patients.filter(p => p.full_name).map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.full_name || patient.id}
                                onSelect={() => {
                                  field.onChange(patient.id);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    patient.id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{patient.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {patient.city || 'Kein Ort'}
                                    {patient.notes && ` • ${patient.notes}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedPatient?.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hinweis: {selectedPatient.notes}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Einsatzart *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Art wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(ASSIGNMENT_TYPE_LABELS) as AssignmentType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {ASSIGNMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Employee Assignment */}
            <FormField
              control={form.control}
              name="assignedEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Mitarbeiter:in zuweisen
                    {isAssigning && (
                      <span className="flex items-center gap-1 text-xs text-primary font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <Sparkles className="h-3 w-3" />
                        Suche verfügbaren Mitarbeiter...
                      </span>
                    )}
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === '_none' ? '' : value)} 
                    value={field.value || '_none'}
                    disabled={isAssigning}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(isAssigning && "opacity-50")}>
                        <SelectValue placeholder="Nicht zugewiesen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Nicht zugewiesen</SelectItem>
                      {employees.map((employee) => {
                        const emp = employee as UserWithQualifications;
                        const isSick = emp.isSick ?? false;
                        return (
                          <SelectItem 
                            key={emp.id} 
                            value={emp.id} 
                            className={cn("flex items-center", isSick && "opacity-60")}
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className={isSick ? 'line-through' : ''}>{emp.name}</span>
                              {isSick && (
                                <span className="text-destructive text-xs">🤒 krank</span>
                              )}
                              <EmployeeQualificationBadges 
                                qualifications={emp.qualifications} 
                                assignmentType={selectedType}
                                compact
                              />
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {!isEditing && !isDemo && (
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <Sparkles className="h-3 w-3" />
                      Wird automatisch zugewiesen basierend auf Verfügbarkeit und Qualifikation
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsible Person (Fallführend) */}
            <FormField
              control={form.control}
              name="responsiblePersonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fallführend</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === '_none' ? '' : value)} 
                    value={field.value || '_none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Keine Fallführung" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Keine Fallführung</SelectItem>
                      {employees.map((employee) => {
                        const emp = employee as UserWithQualifications;
                        return (
                          <SelectItem 
                            key={emp.id} 
                            value={emp.id}
                          >
                            {emp.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Person, die für diesen Fall verantwortlich ist
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Qualification Warning */}
            <QualificationWarning
              employeeId={selectedEmployeeId}
              employeeName={selectedEmployee?.name}
              assignmentType={selectedType}
              employeeQualifications={(selectedEmployee as UserWithQualifications)?.qualifications}
            />

            {/* Sick Employee Warning */}
            {selectedEmployee && (selectedEmployee as UserWithQualifications).isSick && (
              <SickEmployeeWarning
                employeeName={selectedEmployee.name}
                sickSince={(selectedEmployee as UserWithQualifications).sickSince}
              />
            )}

            {/* Conflict Warning */}
            <ConflictWarning
              selectedEmployeeId={selectedEmployeeId}
              selectedDate={selectedDate}
              startTime={selectedStartTime}
              endTime={selectedEndTime}
              existingAssignments={dbAssignments}
              employees={employees}
              currentAssignmentId={assignment?.id}
              patientId={selectedPatient?.id}
              patientName={selectedPatient?.full_name}
              assignmentType={selectedType}
              onSelectEmployee={(empId) => form.setValue('assignedEmployeeId', empId)}
              onApplyTimeChange={(start, end) => {
                form.setValue('preferredStartTime', start);
                form.setValue('preferredEndTime', end);
              }}
            />

            {/* Availability Warning */}
            <AvailabilityWarning
              employeeId={selectedEmployeeId}
              employeeName={selectedEmployee?.name}
              selectedDate={selectedDate}
              startTime={selectedStartTime}
              endTime={selectedEndTime}
              availability={(selectedEmployee as UserWithQualifications)?.availability}
              patientId={selectedPatient?.id}
              patientName={selectedPatient?.full_name}
              assignmentType={selectedType}
              onApplySolution={(solution) => {
                if (solution.suggestedEmployeeId) {
                  form.setValue('assignedEmployeeId', solution.suggestedEmployeeId);
                }
                if (solution.suggestedStartTime && solution.suggestedEndTime) {
                  form.setValue('preferredStartTime', solution.suggestedStartTime);
                  form.setValue('preferredEndTime', solution.suggestedEndTime);
                }
              }}
            />

            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as AssignmentStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorität</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-accent" />
                            Dringend
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recurrence Section */}
            {!isEditing && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Wiederholung (Serie)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wiederholung</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((type) => (
                              <SelectItem key={type} value={type}>
                                {RECURRENCE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedRecurrence !== 'none' && (
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Wiederholen bis *</FormLabel>
                          <Popover open={recurrenceEndPickerOpen} onOpenChange={setRecurrenceEndPickerOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'dd.MM.yyyy', { locale: de })
                                  ) : (
                                    <span>Enddatum wählen</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setRecurrenceEndPickerOpen(false);
                                }}
                                locale={de}
                                disabled={(date) => date < selectedDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {/* Custom weekday selection */}
                {selectedRecurrence === 'custom' && (
                  <FormField
                    control={form.control}
                    name="recurrenceDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wochentage auswählen *</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                            const isSelected = field.value?.includes(day) || false;
                            return (
                              <Button
                                key={day}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                className="w-10 h-10"
                                onClick={() => {
                                  const current = field.value || [];
                                  if (isSelected) {
                                    field.onChange(current.filter((d: number) => d !== day));
                                  } else {
                                    field.onChange([...current, day].sort((a, b) => a - b));
                                  }
                                }}
                              >
                                {WEEKDAY_LABELS[day]}
                              </Button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {selectedRecurrence !== 'none' && (
                  <FormDescription className="text-xs">
                    {selectedRecurrence === 'daily' 
                      ? 'Es wird täglich ein Einsatz erstellt bis zum Enddatum.'
                      : selectedRecurrence === 'weekly'
                      ? 'Es wird wöchentlich ein Einsatz am gleichen Wochentag erstellt.'
                      : 'Es werden Einsätze an den ausgewählten Wochentagen erstellt.'}
                  </FormDescription>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hinweis für Mitarbeiter:in</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="z.B. Türcode, Besonderheiten..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="internalNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interne Notiz (nur Dispo)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Interne Bemerkungen..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit" 
                disabled={hasTravelTimeConflict}
                title={hasTravelTimeConflict ? 'Fahrzeitkonflikt muss gelöst werden' : undefined}
              >
                {isEditing ? 'Speichern' : 'Einsatz erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
