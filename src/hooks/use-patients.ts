import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DbPatient {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientData {
  full_name: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
  is_active?: boolean;
}

export function usePatients() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ['patients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }

      return data as DbPatient[];
    },
    enabled: !!organization?.id,
  });

  const createPatient = useMutation({
    mutationFn: async (data: CreatePatientData) => {
      if (!organization?.id) throw new Error('Keine Organisation');

      // Generate a code from the name (first letters + timestamp suffix)
      const nameCode = data.full_name.split(' ').map(n => n[0]?.toUpperCase() || '').join('');
      const generatedCode = `${nameCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert({
          organization_id: organization.id,
          code: generatedCode,
          full_name: data.full_name,
          phone: data.phone || null,
          city: data.city || null,
          address: data.address || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating patient:', error);
        throw error;
      }

      return newPatient as DbPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Erstellen des Patienten');
    },
  });

  const updatePatient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePatientData }) => {
      const { data: updated, error } = await supabase
        .from('patients')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          city: data.city || null,
          address: data.address || null,
          notes: data.notes || null,
          is_active: data.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating patient:', error);
        throw error;
      }

      return updated as DbPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Aktualisieren des Patienten');
    },
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting patient:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => {
      toast.error('Fehler beim Löschen des Patienten');
    },
  });

  return {
    patients: patientsQuery.data || [],
    isLoading: patientsQuery.isLoading,
    error: patientsQuery.error,
    createPatient,
    updatePatient,
    deletePatient,
    refetch: patientsQuery.refetch,
  };
}
