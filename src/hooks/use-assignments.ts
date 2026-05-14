import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/lib/supabase/types';

type DbAssignmentType = Database['public']['Enums']['assignment_type'];
type DbAssignmentStatus = Database['public']['Enums']['assignment_status'];
type DbPriorityLevel = Database['public']['Enums']['priority_level'];
type DbRecurrenceType = Database['public']['Enums']['recurrence_type'];

export interface DbAssignment {
  id: string;
  organization_id: string;
  patient_id: string;
  assigned_employee_id: string | null;
  responsible_person_id: string | null;
  date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  type: DbAssignmentType;
  zone: string | null;
  status: DbAssignmentStatus;
  priority: DbPriorityLevel;
  internal_note: string | null;
  employee_note: string | null;
  series_id: string | null;
  recurrence: DbRecurrenceType | null;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    full_name: string;
    city: string | null;
    address: string | null;
  };
  assigned_employee?: {
    id: string;
    full_name: string | null;
  };
  responsible_person?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateAssignmentData {
  patient_id: string;
  assigned_employee_id?: string | null;
  responsible_person_id?: string | null;
  date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  duration_minutes: number;
  start_time?: string | null;
  end_time?: string | null;
  type: DbAssignmentType;
  zone?: string;
  status?: DbAssignmentStatus;
  priority?: DbPriorityLevel;
  internal_note?: string;
  employee_note?: string;
  recurrence?: DbRecurrenceType;
  recurrence_end_date?: string;
  series_id?: string;
}

export interface UpdateAssignmentData extends Partial<CreateAssignmentData> {}

export function useAssignments(options?: { patientId?: string; date?: string }) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', organization?.id, options?.patientId, options?.date],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('assignments')
        .select(`
          *,
          patient:patients(id, full_name, city, address),
          assigned_employee:profiles!assignments_assigned_employee_id_fkey(id, full_name),
          responsible_person:profiles!assignments_responsible_person_id_fkey(id, full_name)
        `)
        .eq('organization_id', organization.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (options?.patientId) {
        query = query.eq('patient_id', options.patientId);
      }

      if (options?.date) {
        query = query.eq('date', options.date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching assignments:', error);
        throw error;
      }

      return data as DbAssignment[];
    },
    enabled: !!organization?.id,
  });

  const createAssignment = useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      if (!organization?.id) throw new Error('Keine Organisation');

      const { data: newAssignment, error } = await supabase
        .from('assignments')
        .insert({
          organization_id: organization.id,
          patient_id: data.patient_id,
          assigned_employee_id: data.assigned_employee_id || null,
          responsible_person_id: data.responsible_person_id || null,
          date: data.date,
          preferred_start_time: data.preferred_start_time,
          preferred_end_time: data.preferred_end_time,
          duration_minutes: data.duration_minutes,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          type: data.type,
          zone: data.zone || null,
          status: data.status || 'draft',
          priority: data.priority || 'normal',
          internal_note: data.internal_note || null,
          employee_note: data.employee_note || null,
          recurrence: data.recurrence || 'none',
          recurrence_end_date: data.recurrence_end_date || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        throw error;
      }

      return newAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      toast.error('Fehler beim Erstellen des Einsatzes');
    },
  });

  const createMultipleAssignments = useMutation({
    mutationFn: async (assignments: CreateAssignmentData[]) => {
      if (!organization?.id) throw new Error('Keine Organisation');

      const insertData = assignments.map((data) => ({
        organization_id: organization.id,
        patient_id: data.patient_id,
        assigned_employee_id: data.assigned_employee_id || null,
        responsible_person_id: data.responsible_person_id || null,
        date: data.date,
        preferred_start_time: data.preferred_start_time,
        preferred_end_time: data.preferred_end_time,
        duration_minutes: data.duration_minutes,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        type: data.type,
        zone: data.zone || null,
        status: data.status || 'draft',
        priority: data.priority || 'normal',
        internal_note: data.internal_note || null,
        employee_note: data.employee_note || null,
        recurrence: data.recurrence || 'none',
        recurrence_end_date: data.recurrence_end_date || null,
        series_id: data.series_id || null,
      }));

      const { data: newAssignments, error } = await supabase
        .from('assignments')
        .insert(insertData)
        .select();

      if (error) {
        console.error('Error creating assignments:', error);
        throw error;
      }

      return newAssignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Einsätze');
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssignmentData }) => {
      const { data: updated, error } = await supabase
        .from('assignments')
        .update({
          patient_id: data.patient_id,
          assigned_employee_id: data.assigned_employee_id,
          responsible_person_id: data.responsible_person_id,
          date: data.date,
          preferred_start_time: data.preferred_start_time,
          preferred_end_time: data.preferred_end_time,
          duration_minutes: data.duration_minutes,
          start_time: data.start_time,
          end_time: data.end_time,
          type: data.type,
          zone: data.zone,
          status: data.status,
          priority: data.priority,
          internal_note: data.internal_note,
          employee_note: data.employee_note,
          recurrence: data.recurrence,
          recurrence_end_date: data.recurrence_end_date,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assignment:', error);
        throw error;
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Einsatzes');
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting assignment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Einsatz gelöscht');
    },
    onError: () => {
      toast.error('Fehler beim Löschen des Einsatzes');
    },
  });

  const deleteAssignmentSeries = useMutation({
    mutationFn: async (seriesId: string) => {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('series_id', seriesId);

      if (error) {
        console.error('Error deleting assignment series:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Alle Einsätze der Serie gelöscht');
    },
    onError: () => {
      toast.error('Fehler beim Löschen der Serie');
    },
  });

  // Update all future assignments in a series (useful for recurring series changes)
  const updateAssignmentSeries = useMutation({
    mutationFn: async ({ 
      seriesId, 
      data, 
      fromDate,
      newEndDate,
    }: { 
      seriesId: string; 
      data: Partial<UpdateAssignmentData>; 
      fromDate?: string;
      newEndDate?: string; // If provided, will delete assignments after this date
    }) => {
      // If newEndDate is provided, delete assignments after this date first
      if (newEndDate) {
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('series_id', seriesId)
          .gt('date', newEndDate);

        if (deleteError) {
          console.error('Error deleting assignments beyond new end date:', deleteError);
          throw deleteError;
        }
      }

      // Build update object, only including defined fields
      const updateFields: Record<string, any> = {};
      if (data.assigned_employee_id !== undefined) updateFields.assigned_employee_id = data.assigned_employee_id;
      if (data.responsible_person_id !== undefined) updateFields.responsible_person_id = data.responsible_person_id;
      if (data.preferred_start_time !== undefined) updateFields.preferred_start_time = data.preferred_start_time;
      if (data.preferred_end_time !== undefined) updateFields.preferred_end_time = data.preferred_end_time;
      if (data.duration_minutes !== undefined) updateFields.duration_minutes = data.duration_minutes;
      if (data.start_time !== undefined) updateFields.start_time = data.start_time;
      if (data.end_time !== undefined) updateFields.end_time = data.end_time;
      if (data.type !== undefined) updateFields.type = data.type;
      if (data.zone !== undefined) updateFields.zone = data.zone;
      if (data.status !== undefined) updateFields.status = data.status;
      if (data.priority !== undefined) updateFields.priority = data.priority;
      if (data.internal_note !== undefined) updateFields.internal_note = data.internal_note;
      if (data.employee_note !== undefined) updateFields.employee_note = data.employee_note;
      if (data.recurrence_end_date !== undefined) updateFields.recurrence_end_date = data.recurrence_end_date;

      let query = supabase
        .from('assignments')
        .update(updateFields as any)
        .eq('series_id', seriesId);

      // Optionally only update from a certain date onwards
      if (fromDate) {
        query = query.gte('date', fromDate);
      }

      const { data: updated, error } = await query.select();

      if (error) {
        console.error('Error updating assignment series:', error);
        throw error;
      }

      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success(`${data?.length || 0} Einsätze der Serie aktualisiert`);
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Serie');
    },
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    error: assignmentsQuery.error,
    createAssignment,
    createMultipleAssignments,
    updateAssignment,
    updateAssignmentSeries,
    deleteAssignment,
    deleteAssignmentSeries,
    refetch: assignmentsQuery.refetch,
  };
}
