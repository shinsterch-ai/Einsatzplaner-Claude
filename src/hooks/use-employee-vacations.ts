import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { differenceInBusinessDays, eachDayOfInterval, isWeekend, parseISO, format } from 'date-fns';

export type VacationType = 'vacation' | 'unpaid_leave' | 'special_leave' | 'training';
export type VacationStatus = 'pending' | 'approved' | 'rejected';

export const VACATION_TYPE_LABELS: Record<VacationType, string> = {
  vacation: 'Ferien',
  unpaid_leave: 'Unbezahlter Urlaub',
  special_leave: 'Sonderurlaub',
  training: 'Weiterbildung',
};

export const VACATION_STATUS_LABELS: Record<VacationStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
};

export interface EmployeeVacation {
  id: string;
  employeeId: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  vacationType: VacationType;
  daysCount: number;
  note: string | null;
  status: VacationStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  employee?: {
    id: string;
    fullName: string | null;
  };
}

export interface CreateVacationData {
  employeeId: string;
  startDate: string;
  endDate: string;
  vacationType: VacationType;
  daysCount: number;
  note?: string;
  status?: VacationStatus;
}

export interface UpdateVacationData extends Partial<CreateVacationData> {}

/**
 * Calculate business days between two dates (excludes weekends)
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => !isWeekend(day)).length;
}

export function useEmployeeVacations(options?: { employeeId?: string }) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const vacationsQuery = useQuery({
    queryKey: ['employee-vacations', organization?.id, options?.employeeId],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('employee_vacations')
        .select(`
          *,
          employee:profiles!employee_id(id, full_name)
        `)
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: false });

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vacations:', error);
        throw error;
      }

      return (data || []).map(v => ({
        id: v.id,
        employeeId: v.employee_id,
        organizationId: v.organization_id,
        startDate: v.start_date,
        endDate: v.end_date,
        vacationType: v.vacation_type as VacationType,
        daysCount: Number(v.days_count),
        note: v.note,
        status: v.status as VacationStatus,
        createdBy: v.created_by,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        employee: v.employee ? {
          id: (v.employee as any).id,
          fullName: (v.employee as any).full_name,
        } : undefined,
      })) as EmployeeVacation[];
    },
    enabled: !!organization?.id,
  });

  const createVacation = useMutation({
    mutationFn: async (data: CreateVacationData) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: result, error } = await supabase
        .from('employee_vacations')
        .insert({
          organization_id: organization.id,
          employee_id: data.employeeId,
          start_date: data.startDate,
          end_date: data.endDate,
          vacation_type: data.vacationType,
          days_count: data.daysCount,
          note: data.note || null,
          status: data.status || 'approved',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
      toast.success('Ferien erfolgreich eingetragen');
    },
    onError: (error) => {
      console.error('Error creating vacation:', error);
      toast.error('Fehler beim Eintragen der Ferien');
    },
  });

  const updateVacation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateVacationData & { id: string }) => {
      const updateData: Record<string, any> = {};
      if (data.employeeId) updateData.employee_id = data.employeeId;
      if (data.startDate) updateData.start_date = data.startDate;
      if (data.endDate) updateData.end_date = data.endDate;
      if (data.vacationType) updateData.vacation_type = data.vacationType;
      if (data.daysCount !== undefined) updateData.days_count = data.daysCount;
      if (data.note !== undefined) updateData.note = data.note;
      if (data.status) updateData.status = data.status;

      const { error } = await supabase
        .from('employee_vacations')
        .update(updateData as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
      toast.success('Ferien erfolgreich aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating vacation:', error);
      toast.error('Fehler beim Aktualisieren der Ferien');
    },
  });

  const deleteVacation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_vacations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-vacations'] });
      toast.success('Ferien erfolgreich gelöscht');
    },
    onError: (error) => {
      console.error('Error deleting vacation:', error);
      toast.error('Fehler beim Löschen der Ferien');
    },
  });

  // Calculate used vacation days for an employee
  const getUsedVacationDays = (employeeId: string): number => {
    const employeeVacations = (vacationsQuery.data || [])
      .filter(v => v.employeeId === employeeId && v.status === 'approved' && v.vacationType === 'vacation');
    
    return employeeVacations.reduce((sum, v) => sum + v.daysCount, 0);
  };

  // Check if employee is on vacation on a specific date
  const isOnVacation = (employeeId: string, date: Date | string): boolean => {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    
    return (vacationsQuery.data || []).some(v => 
      v.employeeId === employeeId && 
      v.status === 'approved' &&
      v.startDate <= dateStr && 
      v.endDate >= dateStr
    );
  };

  // Get vacation info for a specific date
  const getVacationInfo = (employeeId: string, date: Date | string): EmployeeVacation | undefined => {
    const checkDate = typeof date === 'string' ? parseISO(date) : date;
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    
    return (vacationsQuery.data || []).find(v => 
      v.employeeId === employeeId && 
      v.status === 'approved' &&
      v.startDate <= dateStr && 
      v.endDate >= dateStr
    );
  };

  return {
    vacations: vacationsQuery.data || [],
    isLoading: vacationsQuery.isLoading,
    error: vacationsQuery.error,
    createVacation,
    updateVacation,
    deleteVacation,
    getUsedVacationDays,
    isOnVacation,
    getVacationInfo,
    refetch: vacationsQuery.refetch,
  };
}
