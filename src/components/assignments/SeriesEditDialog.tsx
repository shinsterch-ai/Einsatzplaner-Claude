import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TimeInput } from '@/components/ui/time-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  Repeat, 
  Users, 
  MapPin,
  Save,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Assignment, AssignmentType, ASSIGNMENT_TYPE_LABELS } from '@/types';
import { useDemoData } from '@/hooks/use-demo-data';
import { useAssignments } from '@/hooks/use-assignments';
import { TypeBadge } from './TypeBadge';
import { toast } from 'sonner';

interface SeriesGroup {
  seriesId: string;
  assignments: Assignment[];
  patientName: string;
  type: Assignment['type'];
  zone: string | null;
  recurrence: Assignment['recurrence'];
  startDate: string;
  endDate: string;
  recurrenceEndDate: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  preferredStartTime: string;
  preferredEndTime: string;
  durationMinutes: number;
  internalNote: string | null;
  count: number;
}

// Helper to normalize time to HH:mm format
const normalizeTime = (time: string) => {
  if (!time) return time;
  // Handle HH:mm:ss format from database
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  return time;
};

const seriesEditSchema = z.object({
  assignedEmployeeId: z.string().optional(),
  preferredStartTime: z.string().min(1, 'Startzeit ist erforderlich').transform(normalizeTime).pipe(
    z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat')
  ),
  preferredEndTime: z.string().min(1, 'Endzeit ist erforderlich').transform(normalizeTime).pipe(
    z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat')
  ),
  durationMinutes: z.number().min(15, 'Mindestens 15 Minuten').max(480, 'Maximal 8 Stunden'),
  type: z.enum(['grundpflege', 'behandlungspflege', 'abklaerung', 'haushalt', 'privatleistungen']),
  internalNote: z.string().max(500).optional(),
  updateFromDate: z.date().optional(),
  recurrenceEndDate: z.date().optional(),
});

type SeriesEditFormData = z.infer<typeof seriesEditSchema>;

interface SeriesEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: SeriesGroup | null;
  onSaved?: () => void;
}

export function SeriesEditDialog({
  open,
  onOpenChange,
  series,
  onSaved,
}: SeriesEditDialogProps) {
  const { employees } = useDemoData();
  const { updateAssignmentSeries } = useAssignments();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SeriesEditFormData>({
    resolver: zodResolver(seriesEditSchema),
    defaultValues: {
      assignedEmployeeId: series?.assignedEmployeeId || undefined,
      preferredStartTime: normalizeTime(series?.preferredStartTime || '08:00'),
      preferredEndTime: normalizeTime(series?.preferredEndTime || '09:00'),
      durationMinutes: series?.durationMinutes || 60,
      type: series?.type || 'grundpflege',
      internalNote: series?.internalNote || '',
      updateFromDate: undefined,
      recurrenceEndDate: series?.recurrenceEndDate ? parseISO(series.recurrenceEndDate) : undefined,
    },
  });

  // Helper to calculate end time from start time and duration
  const calculateEndTime = (startTime: string, duration: number) => {
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return startTime;
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Reset form when series changes
  useMemo(() => {
    if (series) {
      form.reset({
        assignedEmployeeId: series.assignedEmployeeId || undefined,
        preferredStartTime: normalizeTime(series.preferredStartTime),
        preferredEndTime: normalizeTime(series.preferredEndTime),
        durationMinutes: series.durationMinutes,
        type: series.type,
        internalNote: series.internalNote || '',
        updateFromDate: undefined,
        recurrenceEndDate: series.recurrenceEndDate ? parseISO(series.recurrenceEndDate) : undefined,
      });
    }
  }, [series, form]);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.isActive);
  }, [employees]);

  const onSubmit = async (data: SeriesEditFormData) => {
    if (!series) return;
    
    setIsSubmitting(true);
    try {
      const newEndDate = data.recurrenceEndDate ? format(data.recurrenceEndDate, 'yyyy-MM-dd') : undefined;
      const currentEndDate = series.recurrenceEndDate;
      
      // Check if we're shortening the series (need to delete future assignments)
      const shouldDeleteFuture = newEndDate && currentEndDate && newEndDate < currentEndDate;

      await updateAssignmentSeries.mutateAsync({
        seriesId: series.seriesId,
        data: {
          assigned_employee_id: data.assignedEmployeeId || null,
          preferred_start_time: data.preferredStartTime,
          preferred_end_time: data.preferredEndTime,
          start_time: data.preferredStartTime,
          end_time: data.preferredEndTime,
          duration_minutes: data.durationMinutes,
          type: data.type as any,
          internal_note: data.internalNote || null,
          recurrence_end_date: newEndDate || null,
        },
        fromDate: data.updateFromDate ? format(data.updateFromDate, 'yyyy-MM-dd') : undefined,
        newEndDate: shouldDeleteFuture ? newEndDate : undefined,
      });

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error('Error updating series:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!series) return null;

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getRecurrenceLabel = (recurrence: Assignment['recurrence']) => {
    switch (recurrence) {
      case 'daily': return 'Täglich';
      case 'weekly': return 'Wöchentlich';
      default: return 'Einmalig';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Serie bearbeiten
          </DialogTitle>
        </DialogHeader>

        {/* Series Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{series.patientName}</span>
            <TypeBadge type={series.type} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(parseISO(series.startDate), 'd. MMM', { locale: de })} - {format(parseISO(series.endDate), 'd. MMM yyyy', { locale: de })}
            </span>
            <Badge variant="secondary" className="text-xs">
              {getRecurrenceLabel(series.recurrence)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {series.count} Termine
            </Badge>
          </div>
          {series.zone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {series.zone}
            </div>
          )}
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee */}
            <FormField
              control={form.control}
              name="assignedEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mitarbeiter</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || "unassigned"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Mitarbeiter wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Nicht zugewiesen</SelectItem>
                      {activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time and Duration */}
            <div className="space-y-3">
              <FormLabel className="text-sm">Zeitfenster & Dauer</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="preferredStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Von</FormLabel>
                      <FormControl>
                        <TimeInput
                          value={field.value}
                          onChange={(newStartTime) => {
                            field.onChange(newStartTime);
                            // Auto-adjust end time based on current duration
                            const duration = form.getValues('durationMinutes');
                            const newEndTime = calculateEndTime(newStartTime, duration);
                            form.setValue('preferredEndTime', newEndTime);
                          }}
                          placeholder="08:00"
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
                      <FormLabel className="text-xs text-muted-foreground">Dauer</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={15}
                            max={480}
                            step={5}
                            className="h-9 pr-12 font-mono"
                            value={field.value || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const newDuration = isNaN(val) ? 15 : Math.max(15, Math.min(480, val));
                              field.onChange(newDuration);
                              // Auto-adjust end time based on new duration
                              const startTime = form.getValues('preferredStartTime');
                              const newEndTime = calculateEndTime(startTime, newDuration);
                              form.setValue('preferredEndTime', newEndTime);
                            }}
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
                <FormField
                  control={form.control}
                  name="preferredEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Bis</FormLabel>
                      <FormControl>
                        <TimeInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="09:00"
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Die Endzeit wird automatisch aus Startzeit + Dauer berechnet.
              </p>
            </div>

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Einsatzart</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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

            {/* Update from date - optional */}
            <FormField
              control={form.control}
              name="updateFromDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Änderungen ab Datum (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: de })
                          ) : (
                            <span>Alle Termine aktualisieren</span>
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
                        disabled={(date) => date < parseISO(series.startDate)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Leer lassen um alle Termine zu aktualisieren
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence End Date */}
            <FormField
              control={form.control}
              name="recurrenceEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serien-Enddatum</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: de })
                          ) : (
                            <span>Kein Enddatum festgelegt</span>
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
                        disabled={(date) => date < parseISO(series.startDate)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Wird das Enddatum verkürzt, werden alle späteren Termine gelöscht.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal Note */}
            <FormField
              control={form.control}
              name="internalNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interne Notiz</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Interne Notizen zur Serie..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Serie aktualisieren
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}