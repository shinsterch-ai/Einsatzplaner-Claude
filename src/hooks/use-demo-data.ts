import { useMemo, useRef, useEffect } from 'react';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  generateDemoAssignments, 
  demoEmployees, 
  demoPatients, 
  demoZones, 
  demoEmployeeColors 
} from '@/data/demoOrgData';
import { Assignment, User, Patient, Zone } from '@/types';
import { useEmployees, Employee, DayAvailability } from '@/hooks/use-employees';
import { useAssignments, DbAssignment } from '@/hooks/use-assignments';
import { ASSIGNMENT_TYPES } from '@/hooks/use-employee-qualifications';
import { Database } from '@/lib/supabase/types';

type AssignmentType = Database['public']['Enums']['assignment_type'];

// Extended user type with qualifications, sick status, and availability
export interface UserWithQualifications extends User {
  qualifications?: AssignmentType[];
  isSick?: boolean;
  sickSince?: string | null;
  availability?: DayAvailability[];
}

// Convert Employee from hook to UserWithQualifications type
function employeeToUser(emp: Employee): UserWithQualifications {
  return {
    id: emp.id,
    name: emp.fullName || emp.email,
    email: emp.email,
    role: 'employee' as const,
    isActive: emp.isActive,
    createdAt: new Date(emp.createdAt),
    qualifications: emp.qualifications,
    isSick: emp.isSick,
    sickSince: emp.sickSince,
    availability: emp.availability,
  };
}

// Map DB status to UI status (DB uses underscores, UI uses hyphens)
function mapDbStatusToUiStatus(dbStatus: string): Assignment['status'] {
  if (dbStatus === 'in_progress') return 'in-progress';
  return dbStatus as Assignment['status'];
}

// Convert DbAssignment to Assignment type for UI
function dbAssignmentToAssignment(dbAsg: DbAssignment): Assignment {
  // Use actual scheduled times if available, otherwise fall back to preferred times
  // This is important for availability validation - we validate against the ACTUAL time
  const startTime = dbAsg.start_time || dbAsg.preferred_start_time;
  const endTime = dbAsg.end_time || calculateEndTime(dbAsg.preferred_start_time, dbAsg.duration_minutes);
  
  return {
    id: dbAsg.id,
    patientId: dbAsg.patient_id,
    patientName: dbAsg.patient?.full_name || 'Unbekannt',
    patientAddress: dbAsg.patient?.address 
      ? `${dbAsg.patient.address}, ${dbAsg.patient.city || 'Schweiz'}` 
      : undefined,
    type: dbAsg.type,
    zoneId: dbAsg.zone || '',
    zone: dbAsg.zone || '',
    assignedEmployeeId: dbAsg.assigned_employee_id || undefined,
    assignedEmployeeName: dbAsg.assigned_employee?.full_name || undefined,
    responsiblePersonId: dbAsg.responsible_person_id || undefined,
    responsiblePersonName: dbAsg.responsible_person?.full_name || undefined,
    date: new Date(dbAsg.date),
    startTime,
    endTime,
    preferredStartTime: dbAsg.preferred_start_time,
    preferredEndTime: dbAsg.preferred_end_time,
    durationMinutes: dbAsg.duration_minutes,
    status: mapDbStatusToUiStatus(dbAsg.status),
    priority: dbAsg.priority,
    internalNote: dbAsg.internal_note || undefined,
    employeeNote: dbAsg.employee_note || undefined,
    seriesId: dbAsg.series_id || undefined,
    recurrence: dbAsg.recurrence || undefined,
    recurrenceEndDate: dbAsg.recurrence_end_date ? new Date(dbAsg.recurrence_end_date) : undefined,
    createdAt: new Date(dbAsg.created_at),
    updatedAt: new Date(dbAsg.updated_at),
  };
}

// Helper to calculate end time from start time and duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

// Generate HEX colors dynamically for DB employees
const DB_COLOR_PALETTE = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316', 
  '#ef4444', '#06b6d4', '#eab308', '#ec4899', '#84cc16',
];

export function useDemoData() {
  const { isSuperadmin, isLoading: authLoading } = useAuth();
  const { isDemoMode, demoOrgName } = useDemoMode();
  const { employees: dbEmployees, isLoading: employeesLoading } = useEmployees();
  const { assignments: dbAssignments, isLoading: assignmentsLoading } = useAssignments();
  
  // Only use demo data if superadmin AND in demo mode AND not loading
  const useDemo = !authLoading && isSuperadmin && isDemoMode;
  const isLoading = authLoading || employeesLoading || assignmentsLoading;
  
  // Cache demo assignments to prevent regeneration on each render
  const demoAssignmentsRef = useRef<Assignment[] | null>(null);
  const prevUseDemoRef = useRef<boolean>(useDemo);
  
  // Reset cache when demo mode changes
  useEffect(() => {
    if (prevUseDemoRef.current !== useDemo) {
      demoAssignmentsRef.current = null;
      prevUseDemoRef.current = useDemo;
    }
  }, [useDemo]);
  
  // Get assignments based on mode
  const assignments = useMemo<Assignment[]>(() => {
    if (useDemo) {
      // Generate demo assignments once and cache them
      if (!demoAssignmentsRef.current) {
        demoAssignmentsRef.current = generateDemoAssignments();
      }
      return demoAssignmentsRef.current;
    }
    // DB mode: return converted assignments, no fallback to mock data
    return dbAssignments.map(dbAssignmentToAssignment);
  }, [useDemo, dbAssignments]);
  
  // Get employees based on mode
  const employees = useMemo<UserWithQualifications[]>(() => {
    if (useDemo) {
      // Add all qualifications for demo employees, none are sick in demo
      return demoEmployees.map(e => ({
        ...e,
        qualifications: ASSIGNMENT_TYPES.map(t => t.value),
        isSick: false,
        sickSince: null,
      }));
    }
    // DB mode: return converted employees, no fallback to mock data
    return dbEmployees.filter(e => e.isActive).map(employeeToUser);
  }, [useDemo, dbEmployees]);
  
  // Get all users (including inactive for admin views)
  const allUsers = useMemo<User[]>(() => {
    if (useDemo) {
      return demoEmployees;
    }
    return dbEmployees.map(employeeToUser);
  }, [useDemo, dbEmployees]);
  
  // Get patients based on mode
  const patients = useMemo<Patient[]>(() => {
    if (useDemo) {
      return demoPatients;
    }
    // In DB mode, patients are loaded separately via usePatients hook
    // Return empty array here since CalendarPage doesn't use this directly
    return [];
  }, [useDemo]);
  
  // Get zones based on mode
  const zones = useMemo<Zone[]>(() => {
    if (useDemo) {
      return demoZones;
    }
    // In DB mode, zones aren't used from here
    return [];
  }, [useDemo]);
  
  // Get employee colors (always HEX values)
  const colors = useMemo<Record<string, string>>(() => {
    if (useDemo) {
      return demoEmployeeColors;
    }
    // Generate HEX colors for DB employees
    const dynamicColors: Record<string, string> = {};
    dbEmployees.forEach((emp, idx) => {
      dynamicColors[emp.id] = DB_COLOR_PALETTE[idx % DB_COLOR_PALETTE.length];
    });
    return dynamicColors;
  }, [useDemo, dbEmployees]);
  
  return {
    useDemo,
    isLoading,
    demoOrgName: useDemo ? demoOrgName : undefined,
    assignments,
    employees,
    allUsers,
    patients,
    zones,
    employeeColors: colors,
  };
}
