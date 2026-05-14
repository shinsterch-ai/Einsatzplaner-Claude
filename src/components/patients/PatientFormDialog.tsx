import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { InitialAssignmentForm, InitialAssignmentWithDates } from './InitialAssignmentForm';
import { PatientAssignmentsList } from './PatientAssignmentsList';
import { DbPatient } from '@/hooks/use-patients';
import { useAssignments, DbAssignment } from '@/hooks/use-assignments';
import { Database } from '@/lib/supabase/types';
import { CalendarDays, UserCircle } from 'lucide-react';

type DbAssignmentType = Database['public']['Enums']['assignment_type'];

const patientSchema = z.object({
  full_name: z.string().trim().min(1, 'Name ist erforderlich').max(100, 'Name zu lang'),
  phone: z.string().trim().max(30, 'Telefonnummer zu lang').optional(),
  city: z.string().trim().max(100, 'Ort zu lang').optional(),
  address: z.string().trim().max(200, 'Adresse zu lang').optional(),
  notes: z.string().trim().max(500, 'Notiz zu lang').optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

// Database recurrence type (doesn't include 'custom' - that's only for UI date generation)
type DbRecurrenceType = 'none' | 'daily' | 'weekly';

export interface PatientFormData extends PatientFormValues {
  initialAssignments?: {
    date: string;
    start_time: string;
    end_time: string;
    preferred_start_time: string;
    preferred_end_time: string;
    duration_minutes: number;
    type: DbAssignmentType;
    zone?: string;
    recurrence?: DbRecurrenceType;
    recurrence_end_date?: string;
    series_id?: string;
  }[];
}

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: DbPatient | null;
  onSave: (data: PatientFormData) => void;
  isLoading?: boolean;
  onEditAssignment?: (assignment: DbAssignment) => void;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSave,
  isLoading = false,
  onEditAssignment,
}: PatientFormDialogProps) {
  const [initialAssignments, setInitialAssignments] = useState<InitialAssignmentWithDates[]>([]);
  const [activeTab, setActiveTab] = useState<string>('info');
  
  // Fetch existing assignments for the patient
  const { 
    assignments: patientAssignments, 
    isLoading: assignmentsLoading,
    deleteAssignment,
  } = useAssignments({ patientId: patient?.id });
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      city: '',
      address: '',
      notes: '',
    },
  });

  const currentCity = form.watch('city');

  useEffect(() => {
    if (patient) {
      form.reset({
        full_name: patient.full_name || '',
        phone: patient.phone || '',
        city: patient.city || '',
        address: patient.address || '',
        notes: patient.notes || '',
      });
      setInitialAssignments([]);
      setActiveTab('info');
    } else {
      form.reset({
        full_name: '',
        phone: '',
        city: '',
        address: '',
        notes: '',
      });
      setInitialAssignments([]);
      setActiveTab('info');
    }
  }, [patient, form, open]);

  const handleAddAssignment = (assignment: InitialAssignmentWithDates) => {
    setInitialAssignments((prev) => [...prev, assignment]);
  };

  const handleRemoveAssignment = (index: number) => {
    setInitialAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditExistingAssignment = (assignment: DbAssignment) => {
    if (onEditAssignment) {
      onEditAssignment(assignment);
    }
  };

  const handleDeleteExistingAssignment = async (assignmentId: string) => {
    await deleteAssignment.mutateAsync(assignmentId);
  };

  const handleSubmit = (data: PatientFormValues) => {
    const formData: PatientFormData = {
      ...data,
    };

    // Include new assignments (for both new and existing patients)
    if (initialAssignments.length > 0) {
      const allAssignments: PatientFormData['initialAssignments'] = [];

      initialAssignments.forEach((a) => {
        // For recurring assignments, create one entry per generated date
        if (a.recurrence !== 'none' && a.generatedDates && a.generatedDates.length > 0) {
          // Map 'custom' to 'weekly' for database storage (custom is only for date generation)
          const dbRecurrence: DbRecurrenceType = a.recurrence === 'custom' ? 'weekly' : a.recurrence;
          
          a.generatedDates.forEach((dateStr) => {
            allAssignments.push({
              date: dateStr,
              start_time: a.preferredStartTime,
              end_time: a.preferredEndTime,
              type: a.type as DbAssignmentType,
              zone: a.zone || currentCity,
              duration_minutes: a.durationMinutes,
              preferred_start_time: a.preferredStartTime,
              preferred_end_time: a.preferredEndTime,
              recurrence: dbRecurrence,
              recurrence_end_date: a.recurrenceEndDate ? format(a.recurrenceEndDate, 'yyyy-MM-dd') : undefined,
              series_id: a.seriesId,
            });
          });
        } else {
          // Single assignment
          allAssignments.push({
            date: format(a.date, 'yyyy-MM-dd'),
            start_time: a.preferredStartTime,
            end_time: a.preferredEndTime,
            type: a.type as DbAssignmentType,
            zone: a.zone || currentCity,
            duration_minutes: a.durationMinutes,
            preferred_start_time: a.preferredStartTime,
            preferred_end_time: a.preferredEndTime,
          });
        }
      });

      formData.initialAssignments = allAssignments;
    }

    onSave(formData);
    onOpenChange(false);
  };

  // Filter out past assignments and cancelled ones for display
  const activeAssignments = patientAssignments.filter(a => a.status !== 'cancelled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing when clicking on Google Maps autocomplete dropdown
          const target = e.target as HTMLElement;
          if (target.closest('.pac-container')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Also prevent interaction outside from closing the dialog for pac-container
          const target = e.target as HTMLElement;
          if (target.closest('.pac-container')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {patient ? 'Klient bearbeiten' : 'Neuer Klient'}
          </DialogTitle>
        </DialogHeader>

        {patient ? (
          // Editing existing patient - show tabs
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="gap-2">
                <UserCircle className="h-4 w-4" />
                Stammdaten
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Einsätze ({activeAssignments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Maria Müller" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 044 123 45 67" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value || ''}
                            onChange={field.onChange}
                            onPlaceSelect={(place) => {
                              field.onChange(place.address);
                              if (place.city) {
                                form.setValue('city', place.city);
                              }
                            }}
                            placeholder="Strasse, PLZ Ort eingeben..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ort</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Wird automatisch ausgefüllt" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notizen</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="z.B. Türcode, Schlüssel bei Nachbar..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Speichern...' : 'Speichern'}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="assignments" className="mt-4 space-y-4">
              <PatientAssignmentsList
                assignments={activeAssignments}
                isLoading={assignmentsLoading}
                onEdit={handleEditExistingAssignment}
                onDelete={handleDeleteExistingAssignment}
                isDeleting={deleteAssignment.isPending}
              />

              <Separator />

              <InitialAssignmentForm
                assignments={initialAssignments}
                onAdd={handleAddAssignment}
                onRemove={handleRemoveAssignment}
                patientCity={currentCity}
              />

              {initialAssignments.length > 0 && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    type="button" 
                    disabled={isLoading}
                    onClick={() => form.handleSubmit(handleSubmit)()}
                  >
                    {isLoading ? 'Speichern...' : `${initialAssignments.length} neue(n) Einsatz/Einsätze erstellen`}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Creating new patient - show form without tabs
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Maria Müller" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. 044 123 45 67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value || ''}
                        onChange={field.onChange}
                        onPlaceSelect={(place) => {
                          field.onChange(place.address);
                          if (place.city) {
                            form.setValue('city', place.city);
                          }
                        }}
                        placeholder="Strasse, PLZ Ort eingeben..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ort</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Wird automatisch ausgefüllt" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notizen</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="z.B. Türcode, Schlüssel bei Nachbar..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-4" />
              <InitialAssignmentForm
                assignments={initialAssignments}
                onAdd={handleAddAssignment}
                onRemove={handleRemoveAssignment}
                patientCity={currentCity}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Speichern...' : 'Erstellen'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
