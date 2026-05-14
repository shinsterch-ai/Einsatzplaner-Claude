import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Trash2, Calendar as CalendarIcon, Clock, Repeat } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeInput } from '@/components/ui/time-input';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { 
  ASSIGNMENT_TYPE_LABELS, 
  AssignmentType,
  RECURRENCE_LABELS,
  RecurrenceType,
  WEEKDAY_LABELS,
} from '@/types';

// Duration constraints
const MIN_DURATION = 15;
const MAX_DURATION = 480;

const assignmentSchema = z.object({
  date: z.date({ message: 'Datum ist erforderlich' }),
  preferredStartTime: z.string().min(1, 'Startzeit ist erforderlich').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat'),
  preferredEndTime: z.string().min(1, 'Endzeit ist erforderlich').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat'),
  durationMinutes: z.number().min(15, 'Mindestens 15 Minuten'),
  type: z.enum(['grundpflege', 'behandlungspflege', 'abklaerung', 'haushalt', 'privatleistungen'] as const),
  zone: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'custom'] as const).default('none'),
  recurrenceEndDate: z.date().optional(),
  recurrenceDays: z.array(z.number()).optional(),
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
  // Require end date for recurring assignments
  if (data.recurrence !== 'none' && !data.recurrenceEndDate) {
    return false;
  }
  return true;
}, {
  message: 'Enddatum ist für wiederkehrende Einsätze erforderlich',
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

export type InitialAssignmentValues = z.infer<typeof assignmentSchema>;

// Extended type with generated dates for recurring assignments
export interface InitialAssignmentWithDates extends InitialAssignmentValues {
  generatedDates?: string[];
  seriesId?: string;
}

interface InitialAssignmentFormProps {
  assignments: InitialAssignmentWithDates[];
  onAdd: (assignment: InitialAssignmentWithDates) => void;
  onRemove: (index: number) => void;
  patientCity?: string;
}

// Generate dates for recurring assignments
function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  recurrence: RecurrenceType,
  recurrenceDays?: number[]
): string[] {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    
    if (recurrence === 'daily') {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    } else if (recurrence === 'weekly') {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addWeeks(currentDate, 1);
    } else if (recurrence === 'custom' && recurrenceDays && recurrenceDays.length > 0) {
      if (recurrenceDays.includes(dayOfWeek)) {
        dates.push(format(currentDate, 'yyyy-MM-dd'));
      }
      currentDate = addDays(currentDate, 1);
    } else {
      break;
    }
  }
  
  return dates;
}

export function InitialAssignmentForm({
  assignments,
  onAdd,
  onRemove,
  patientCity,
}: InitialAssignmentFormProps) {
  const [showForm, setShowForm] = useState(false);

  const form = useForm<InitialAssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      date: addDays(new Date(), 1),
      preferredStartTime: '08:00',
      preferredEndTime: '10:00',
      durationMinutes: 60,
      type: 'grundpflege',
      zone: patientCity || '',
      recurrence: 'none',
      recurrenceEndDate: addWeeks(new Date(), 4),
      recurrenceDays: [],
    },
  });

  const selectedRecurrence = form.watch('recurrence');
  const startDate = form.watch('date');

  const handleAdd = (data: InitialAssignmentValues) => {
    const assignmentData: InitialAssignmentWithDates = {
      ...data,
    };

    // Generate dates for recurring assignments
    if (data.recurrence !== 'none' && data.recurrenceEndDate) {
      const dates = generateRecurringDates(
        data.date,
        data.recurrenceEndDate,
        data.recurrence,
        data.recurrenceDays
      );
      assignmentData.generatedDates = dates;
      assignmentData.seriesId = crypto.randomUUID();
    }

    onAdd(assignmentData);
    form.reset({
      date: addDays(new Date(), 1),
      preferredStartTime: '08:00',
      preferredEndTime: '10:00',
      durationMinutes: 60,
      type: 'grundpflege',
      zone: patientCity || '',
      recurrence: 'none',
      recurrenceEndDate: addWeeks(new Date(), 4),
      recurrenceDays: [],
    });
    setShowForm(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours} Std. ${mins} Min.` : `${hours} Std.`;
    }
    return `${minutes} Min.`;
  };

  const getRecurrenceLabel = (assignment: InitialAssignmentWithDates) => {
    if (assignment.recurrence === 'none') return null;
    
    const count = assignment.generatedDates?.length || 0;
    return `${RECURRENCE_LABELS[assignment.recurrence]} (${count}×)`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Einsätze (optional)</span>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Einsatz hinzufügen
          </Button>
        )}
      </div>

      {/* List of added assignments */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((assignment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {assignment.recurrence !== 'none' && assignment.recurrenceEndDate ? (
                    <>
                      {format(assignment.date, 'dd.MM.', { locale: de })} - {format(assignment.recurrenceEndDate, 'dd.MM.yy', { locale: de })}
                    </>
                  ) : (
                    format(assignment.date, 'EEE, dd.MM.', { locale: de })
                  )}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {assignment.preferredStartTime} - {assignment.preferredEndTime}
                </span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                  {formatDuration(assignment.durationMinutes)}
                </span>
                <span className="px-2 py-0.5 bg-background rounded text-xs">
                  {ASSIGNMENT_TYPE_LABELS[assignment.type as AssignmentType]}
                </span>
                {getRecurrenceLabel(assignment) && (
                  <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded text-xs flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    {getRecurrenceLabel(assignment)}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add assignment form */}
      {showForm && (
        <Form {...form}>
          <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">Startdatum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal h-9',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd.MM.yyyy', { locale: de })
                            ) : (
                              'Datum wählen'
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          locale={de}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Einsatzart</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Art wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Window Section */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Wunschzeitfenster</span>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="preferredStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Von</FormLabel>
                      <FormControl>
                        <TimeInput
                          className="h-9"
                          value={field.value}
                          onChange={field.onChange}
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
                      <FormLabel className="text-xs">Bis</FormLabel>
                      <FormControl>
                        <TimeInput
                          className="h-9"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Duration Input */}
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Dauer (Min.)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={MIN_DURATION}
                        max={MAX_DURATION}
                        step={5}
                        className="h-9 pr-12"
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

            {/* Recurrence Section */}
            <div className="space-y-3 pt-2 border-t">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5" />
                      Wiederholung
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Wiederholung wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom weekday selection */}
              {selectedRecurrence === 'custom' && (
                <FormField
                  control={form.control}
                  name="recurrenceDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Wochentage auswählen *</FormLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                          const isSelected = field.value?.includes(day);
                          return (
                            <Toggle
                              key={day}
                              size="sm"
                              pressed={isSelected}
                              onPressedChange={(pressed) => {
                                const current = field.value || [];
                                if (pressed) {
                                  field.onChange([...current, day]);
                                } else {
                                  field.onChange(current.filter((d) => d !== day));
                                }
                              }}
                              className={cn(
                                'h-8 w-8 p-0 text-xs',
                                isSelected && 'bg-primary text-primary-foreground'
                              )}
                            >
                              {WEEKDAY_LABELS[day]}
                            </Toggle>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* End date for recurring assignments */}
              {selectedRecurrence !== 'none' && (
                <FormField
                  control={form.control}
                  name="recurrenceEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs">Enddatum der Serie *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal h-9',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd.MM.yyyy', { locale: de })
                              ) : (
                                'Enddatum wählen'
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date <= startDate}
                            locale={de}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {selectedRecurrence === 'none' 
                ? 'Der Einsatz wird automatisch einem verfügbaren Mitarbeiter im Wunschzeitfenster zugeordnet.'
                : 'Die wiederkehrenden Einsätze werden als Serie erstellt und automatisch zugeordnet.'
              }
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(handleAdd)}
              >
                Hinzufügen
              </Button>
            </div>
          </div>
        </Form>
      )}
    </div>
  );
}
