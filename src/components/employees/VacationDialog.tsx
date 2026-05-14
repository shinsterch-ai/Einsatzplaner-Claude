import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInBusinessDays, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Loader2, Palmtree } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  EmployeeVacation,
  VacationType,
  VACATION_TYPE_LABELS,
  calculateBusinessDays,
} from "@/hooks/use-employee-vacations";

const vacationSchema = z.object({
  startDate: z.date({ message: "Startdatum ist erforderlich" }),
  endDate: z.date({ message: "Enddatum ist erforderlich" }),
  vacationType: z.enum(['vacation', 'unpaid_leave', 'special_leave', 'training']),
  daysCount: z.number().min(0.5, "Mindestens 0.5 Tage"),
  note: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "Enddatum muss nach oder gleich Startdatum sein",
  path: ["endDate"],
});

type VacationFormData = z.infer<typeof vacationSchema>;

interface VacationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  vacation?: EmployeeVacation;
  onSave: (data: {
    startDate: string;
    endDate: string;
    vacationType: VacationType;
    daysCount: number;
    note?: string;
  }) => Promise<void>;
  remainingVacationDays?: number;
}

export function VacationDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  vacation,
  onSave,
  remainingVacationDays,
}: VacationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VacationFormData>({
    resolver: zodResolver(vacationSchema),
    defaultValues: {
      startDate: vacation ? parseISO(vacation.startDate) : new Date(),
      endDate: vacation ? parseISO(vacation.endDate) : new Date(),
      vacationType: vacation?.vacationType || 'vacation',
      daysCount: vacation?.daysCount || 1,
      note: vacation?.note || '',
    },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  // Auto-calculate business days when dates change
  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      const businessDays = calculateBusinessDays(startDate, endDate);
      form.setValue('daysCount', businessDays);
    }
  }, [startDate, endDate, form]);

  const onSubmit = async (data: VacationFormData) => {
    setIsSubmitting(true);
    try {
      await onSave({
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        vacationType: data.vacationType,
        daysCount: data.daysCount,
        note: data.note,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving vacation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-primary" />
            {vacation ? 'Ferien bearbeiten' : 'Ferien eintragen'}
          </DialogTitle>
          <DialogDescription>
            {employeeName}
            {remainingVacationDays !== undefined && (
              <span className="ml-2 text-muted-foreground">
                ({remainingVacationDays} Tage verfügbar)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Von</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy", { locale: de })
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
                          onSelect={field.onChange}
                          locale={de}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bis</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd.MM.yyyy", { locale: de })
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
                          onSelect={field.onChange}
                          disabled={(date) => date < (startDate || new Date())}
                          locale={de}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vacationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abwesenheitsart</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(VACATION_TYPE_LABELS) as VacationType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {VACATION_TYPE_LABELS[type]}
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
                name="daysCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arbeitstage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notiz (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="z.B. Skiferien, Familienbesuch..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
