import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/lib/supabase/types';
import { useWorktimeSettings } from '@/hooks/use-worktime-settings';

type AssignmentType = Database['public']['Enums']['assignment_type'];

export type WeekPattern = 'every' | 'even' | 'odd';

export interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  weekPattern: WeekPattern;
}

export interface Employee {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  workPercentage: number | null;
  weeklyHours: number | null;
  createdAt: string;
  updatedAt: string;
  qualifications: AssignmentType[];
  availability: DayAvailability[];
  weekPattern: WeekPattern;
  isSick: boolean;
  sickSince: string | null;
  sickUntil: string | null;
  sickNote: string | null;
  roles: ('mitarbeiter' | 'planer' | 'admin')[];
  vacationDaysTotal: number | null;
}

export interface EmployeeInput {
  name: string;
  email: string;
  workPercentage: number;
  isActive: boolean;
  qualifications: AssignmentType[];
  availability: DayAvailability[];
}

// Calculate weekly hours based on work percentage and configurable base
const DEFAULT_BASE_WEEKLY_HOURS = 40;
export function calculateWeeklyHours(workPercentage: number, baseWeeklyHours: number = DEFAULT_BASE_WEEKLY_HOURS): number {
  return Math.round((workPercentage / 100) * baseWeeklyHours * 10) / 10;
}

// Calculate available hours from availability schedule
export function calculateAvailableHoursFromSchedule(availability: DayAvailability[]): number {
  return availability.reduce((total, day) => {
    if (!day.isAvailable) return total;
    const [startHour, startMin] = day.startTime.split(':').map(Number);
    const [endHour, endMin] = day.endTime.split(':').map(Number);
    const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
    return total + Math.max(0, hours);
  }, 0);
}

// Calculate utilization percentage
export function calculateUtilization(scheduledHours: number, maxHours: number): number {
  if (maxHours <= 0) return 0;
  return Math.round((scheduledHours / maxHours) * 100);
}

export function useEmployees() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: worktimeSettings } = useWorktimeSettings();
  const baseWeeklyHours = worktimeSettings?.weekly_hours_base ?? 40;

  // Fetch all employees for the organization
  const employeesQuery = useQuery({
    queryKey: ['employees', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch profiles with employee role
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organization.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // For each profile, fetch their qualifications and availability
      const employees: Employee[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Fetch qualifications
          const { data: qualifications } = await supabase
            .from('employee_qualifications')
            .select('assignment_type')
            .eq('employee_id', profile.id);

          // Fetch availability
          const { data: availabilityData } = await supabase
            .from('employee_availability')
            .select('*')
            .eq('employee_id', profile.id);

          // Fetch roles
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          const availability: DayAvailability[] = (availabilityData || []).map((a) => ({
            dayOfWeek: a.day_of_week,
            isAvailable: a.is_available,
            startTime: a.start_time || '08:00',
            endTime: a.end_time || '17:00',
            weekPattern: (a.week_pattern as WeekPattern) || 'every',
          }));

          // Determine overall week pattern from first availability entry
          const weekPattern: WeekPattern = (availabilityData?.[0]?.week_pattern as WeekPattern) || 'every';

          const roles = (rolesData || []).map((r) => r.role).filter(
            (role): role is 'mitarbeiter' | 'planer' | 'admin' => 
              role === 'mitarbeiter' || role === 'planer' || role === 'admin'
          );

          return {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            phone: profile.phone ?? null,
            isActive: profile.is_active,
            workPercentage: profile.work_percentage,
            weeklyHours: profile.weekly_hours,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
            qualifications: (qualifications || []).map((q) => q.assignment_type),
            availability,
            weekPattern,
            isSick: profile.is_sick ?? false,
            sickSince: profile.sick_since ?? null,
            sickUntil: profile.sick_until ?? null,
            sickNote: profile.sick_note ?? null,
            roles,
            vacationDaysTotal: profile.vacation_days_total ?? 25,
          };
        })
      );

      return employees;
    },
    enabled: !!organization?.id,
  });

  // Update employee profile
  const updateEmployee = useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: EmployeeInput;
    }) => {
      const weeklyHours = calculateWeeklyHours(data.workPercentage, baseWeeklyHours);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          is_active: data.isActive,
          work_percentage: data.workPercentage,
          weekly_hours: weeklyHours,
        })
        .eq('id', employeeId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Update qualifications
      await supabase
        .from('employee_qualifications')
        .delete()
        .eq('employee_id', employeeId);

      if (data.qualifications.length > 0) {
        const { error: qualError } = await supabase
          .from('employee_qualifications')
          .insert(
            data.qualifications.map((type) => ({
              employee_id: employeeId,
              assignment_type: type,
            }))
          );
        if (qualError) {
          console.error('Error updating qualifications:', qualError);
          throw qualError;
        }
      }

      // Update availability
      await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId);

      if (data.availability.length > 0) {
        const { error: availError } = await supabase
          .from('employee_availability')
          .insert(
            data.availability.map((day) => ({
              employee_id: employeeId,
              day_of_week: day.dayOfWeek,
              is_available: day.isAvailable,
              start_time: day.startTime,
              end_time: day.endTime,
              week_pattern: day.weekPattern || 'every',
            }))
          );
        if (availError) {
          console.error('Error updating availability:', availError);
          throw availError;
        }
      }

      return { employeeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Mitarbeiter aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating employee:', error);
      toast.error('Fehler beim Aktualisieren');
    },
  });

  // Save availability for an employee
  const saveAvailability = useMutation({
    mutationFn: async ({
      employeeId,
      availability,
    }: {
      employeeId: string;
      availability: DayAvailability[];
    }) => {
      // Delete existing availability
      await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId);

      // Insert new availability
      if (availability.length > 0) {
        const { error } = await supabase
          .from('employee_availability')
          .insert(
            availability.map((day) => ({
              employee_id: employeeId,
              day_of_week: day.dayOfWeek,
              is_available: day.isAvailable,
              start_time: day.startTime,
              end_time: day.endTime,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  // Update work percentage
  const updateWorkPercentage = useMutation({
    mutationFn: async ({
      employeeId,
      workPercentage,
    }: {
      employeeId: string;
      workPercentage: number;
    }) => {
      const weeklyHours = calculateWeeklyHours(workPercentage, baseWeeklyHours);

      const { error } = await supabase
        .from('profiles')
        .update({
          work_percentage: workPercentage,
          weekly_hours: weeklyHours,
        })
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  // Update sick status
  const updateSickStatus = useMutation({
    mutationFn: async ({
      employeeId,
      isSick,
      sickSince,
      sickUntil,
      sickNote,
    }: {
      employeeId: string;
      isSick: boolean;
      sickSince?: string | null;
      sickUntil?: string | null;
      sickNote?: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_sick: isSick,
          sick_since: isSick ? sickSince : null,
          sick_until: isSick ? sickUntil : null,
          sick_note: isSick ? sickNote : null,
        })
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Krankmeldung aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating sick status:', error);
      toast.error('Fehler beim Aktualisieren');
    },
  });

  // Update vacation days total
  const updateVacationDaysTotal = useMutation({
    mutationFn: async ({
      employeeId,
      vacationDaysTotal,
    }: {
      employeeId: string;
      vacationDaysTotal: number;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ vacation_days_total: vacationDaysTotal })
        .eq('id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Feriensaldo aktualisiert');
    },
    onError: (error) => {
      console.error('Error updating vacation days:', error);
      toast.error('Fehler beim Aktualisieren des Feriensaldos');
    },
  });

  // Delete employee (profile and related data)
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      // Delete qualifications first (foreign key constraint)
      await supabase
        .from('employee_qualifications')
        .delete()
        .eq('employee_id', employeeId);

      // Delete availability
      await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId);

      // Delete user roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employeeId);

      // Finally delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('Error deleting employee:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Mitarbeiter entfernt');
    },
    onError: (error) => {
      console.error('Error deleting employee:', error);
      toast.error('Fehler beim Löschen des Mitarbeiters');
    },
  });

  return {
    employees: employeesQuery.data || [],
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    updateEmployee,
    saveAvailability,
    updateWorkPercentage,
    updateSickStatus,
    updateVacationDaysTotal,
    deleteEmployee,
    refetch: employeesQuery.refetch,
  };
}

// Hook for a single employee
export function useEmployee(employeeId?: string) {
  const { employees } = useEmployees();
  
  const employee = employees.find((e) => e.id === employeeId);
  
  const maxWeeklyHours = employee?.weeklyHours ?? calculateWeeklyHours(employee?.workPercentage ?? 100);
  const availableHours = calculateAvailableHoursFromSchedule(employee?.availability || []);
  
  return {
    employee,
    maxWeeklyHours,
    availableHours,
    utilizationCapacity: availableHours > 0 ? Math.round((maxWeeklyHours / availableHours) * 100) : 0,
  };
}
