import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/lib/supabase/types';

type AssignmentType = Database['public']['Enums']['assignment_type'];

export interface EmployeeQualification {
  id: string;
  employee_id: string;
  assignment_type: AssignmentType;
  certified_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// All available assignment types with German labels
export const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'grundpflege', label: 'Grundpflege' },
  { value: 'behandlungspflege', label: 'Behandlungspflege' },
  { value: 'abklaerung', label: 'Abklärung' },
  { value: 'haushalt', label: 'Haushalt' },
  { value: 'privatleistungen', label: 'Privatleistungen' },
];

export function useEmployeeQualifications(employeeId?: string) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch qualifications for a specific employee
  const qualificationsQuery = useQuery({
    queryKey: ['employee-qualifications', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('employee_qualifications')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error fetching qualifications:', error);
        throw error;
      }

      return data as EmployeeQualification[];
    },
    enabled: !!employeeId,
  });

  // Set qualifications for an employee (replaces all existing)
  const setQualifications = useMutation({
    mutationFn: async ({
      employeeId,
      assignmentTypes,
    }: {
      employeeId: string;
      assignmentTypes: AssignmentType[];
    }) => {
      // First, delete all existing qualifications for this employee
      const { error: deleteError } = await supabase
        .from('employee_qualifications')
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) {
        console.error('Error deleting qualifications:', deleteError);
        throw deleteError;
      }

      // If no qualifications to add, we're done
      if (assignmentTypes.length === 0) {
        return [];
      }

      // Insert new qualifications
      const insertData = assignmentTypes.map((type) => ({
        employee_id: employeeId,
        assignment_type: type,
      }));

      const { data, error: insertError } = await supabase
        .from('employee_qualifications')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Error inserting qualifications:', insertError);
        throw insertError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-qualifications', variables.employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ['employee-qualifications'] });
    },
    onError: () => {
      toast.error('Fehler beim Speichern der Qualifikationen');
    },
  });

  // Add a single qualification
  const addQualification = useMutation({
    mutationFn: async ({
      employeeId,
      assignmentType,
    }: {
      employeeId: string;
      assignmentType: AssignmentType;
    }) => {
      const { data, error } = await supabase
        .from('employee_qualifications')
        .insert({
          employee_id: employeeId,
          assignment_type: assignmentType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding qualification:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-qualifications', variables.employeeId],
      });
    },
  });

  // Remove a qualification
  const removeQualification = useMutation({
    mutationFn: async ({
      employeeId,
      assignmentType,
    }: {
      employeeId: string;
      assignmentType: AssignmentType;
    }) => {
      const { error } = await supabase
        .from('employee_qualifications')
        .delete()
        .eq('employee_id', employeeId)
        .eq('assignment_type', assignmentType);

      if (error) {
        console.error('Error removing qualification:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-qualifications', variables.employeeId],
      });
    },
  });

  // Get the list of assignment types this employee is qualified for
  const qualifiedTypes = qualificationsQuery.data?.map((q) => q.assignment_type) || [];

  return {
    qualifications: qualificationsQuery.data || [],
    qualifiedTypes,
    isLoading: qualificationsQuery.isLoading,
    error: qualificationsQuery.error,
    setQualifications,
    addQualification,
    removeQualification,
    refetch: qualificationsQuery.refetch,
  };
}
