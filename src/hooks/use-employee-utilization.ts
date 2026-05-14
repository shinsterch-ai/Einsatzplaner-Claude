import { useMemo } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { Assignment } from '@/types';
import { DayAvailability } from '@/components/employees/AvailabilitySchedule';
import { calculateWeeklyHours, calculateAvailableHoursFromSchedule } from '@/hooks/use-employees';

// Base weekly hours (40h standard)
const BASE_WEEKLY_HOURS = 40;
const WEEKS_PER_MONTH = 4.33;
const WEEKS_PER_YEAR = 52;

export interface EmployeeUtilization {
  employeeId: string;
  employeeName: string;
  /** Target hours based on work percentage (40h base) - weekly */
  targetHours: number;
  /** Monthly target hours */
  monthlyTargetHours: number;
  /** Yearly target hours */
  yearlyTargetHours: number;
  /** Work percentage */
  workPercentage: number;
  /** Available hours based on availability schedule */
  availableHours: number;
  /** Actually scheduled hours from assignments this week */
  scheduledHours: number;
  /** Actually scheduled hours from assignments this month */
  monthlyScheduledHours: number;
  /** Utilization: scheduledHours / targetHours * 100 (weekly) */
  utilizationPercent: number;
  /** Monthly utilization percent */
  monthlyUtilizationPercent: number;
  /** How many assignments this week */
  assignmentCount: number;
  /** Is employee currently sick */
  isSick: boolean;
}

interface EmployeeData {
  id: string;
  fullName: string | null;
  email: string;
  workPercentage: number | null;
  weeklyHours: number | null;
  availability: DayAvailability[];
  isSick?: boolean;
}

/**
 * Calculate hours from an assignment's start and end time
 */
function calculateAssignmentHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

/**
 * Hook to calculate utilization for all employees based on actual scheduled assignments
 */
export function useEmployeeUtilization(
  employees: EmployeeData[],
  assignments: Assignment[],
  weekDate: Date = new Date()
): EmployeeUtilization[] {
  return useMemo(() => {
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    const monthStart = startOfMonth(weekDate);
    const monthEnd = endOfMonth(weekDate);

    // Filter assignments for current week
    const weekAssignments = assignments.filter((a) => {
      const assignmentDate = typeof a.date === 'string' ? parseISO(a.date) : a.date;
      return assignmentDate >= weekStart && assignmentDate <= weekEnd;
    });

    // Filter assignments for current month
    const monthAssignments = assignments.filter((a) => {
      const assignmentDate = typeof a.date === 'string' ? parseISO(a.date) : a.date;
      return assignmentDate >= monthStart && assignmentDate <= monthEnd;
    });

    // Group assignments by employee (week)
    const assignmentsByEmployee = new Map<string, Assignment[]>();
    weekAssignments.forEach((a) => {
      if (a.assignedEmployeeId) {
        const existing = assignmentsByEmployee.get(a.assignedEmployeeId) || [];
        existing.push(a);
        assignmentsByEmployee.set(a.assignedEmployeeId, existing);
      }
    });

    // Group assignments by employee (month)
    const monthlyAssignmentsByEmployee = new Map<string, Assignment[]>();
    monthAssignments.forEach((a) => {
      if (a.assignedEmployeeId) {
        const existing = monthlyAssignmentsByEmployee.get(a.assignedEmployeeId) || [];
        existing.push(a);
        monthlyAssignmentsByEmployee.set(a.assignedEmployeeId, existing);
      }
    });

    // Calculate utilization for each employee
    return employees.map((employee) => {
      const workPercentage = employee.workPercentage ?? 100;
      const targetHours = employee.weeklyHours ?? calculateWeeklyHours(workPercentage);
      const monthlyTargetHours = Math.round(targetHours * WEEKS_PER_MONTH * 10) / 10;
      const yearlyTargetHours = Math.round(targetHours * WEEKS_PER_YEAR);
      const availableHours = calculateAvailableHoursFromSchedule(employee.availability || []);

      const employeeAssignments = assignmentsByEmployee.get(employee.id) || [];
      const scheduledHours = employeeAssignments.reduce((total, a) => {
        return total + calculateAssignmentHours(a.startTime, a.endTime);
      }, 0);

      const monthlyEmployeeAssignments = monthlyAssignmentsByEmployee.get(employee.id) || [];
      const monthlyScheduledHours = monthlyEmployeeAssignments.reduce((total, a) => {
        return total + calculateAssignmentHours(a.startTime, a.endTime);
      }, 0);

      const utilizationPercent = targetHours > 0 
        ? Math.round((scheduledHours / targetHours) * 100) 
        : 0;

      const monthlyUtilizationPercent = monthlyTargetHours > 0
        ? Math.round((monthlyScheduledHours / monthlyTargetHours) * 100)
        : 0;

      return {
        employeeId: employee.id,
        employeeName: employee.fullName || employee.email,
        targetHours,
        monthlyTargetHours,
        yearlyTargetHours,
        workPercentage,
        availableHours,
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        monthlyScheduledHours: Math.round(monthlyScheduledHours * 10) / 10,
        utilizationPercent,
        monthlyUtilizationPercent,
        assignmentCount: employeeAssignments.length,
        isSick: employee.isSick ?? false,
      };
    });
  }, [employees, assignments, weekDate]);
}

/**
 * Get a single employee's utilization
 */
export function getEmployeeUtilization(
  employeeId: string,
  utilizations: EmployeeUtilization[]
): EmployeeUtilization | undefined {
  return utilizations.find((u) => u.employeeId === employeeId);
}

/**
 * Get utilization status color class
 */
export function getUtilizationColor(percent: number): string {
  if (percent > 100) return 'text-destructive';
  if (percent > 90) return 'text-amber-600';
  if (percent > 70) return 'text-green-600';
  return 'text-muted-foreground';
}

/**
 * Get utilization progress bar color class
 */
export function getUtilizationProgressClass(percent: number): string {
  if (percent > 100) return '[&>div]:bg-destructive';
  if (percent > 90) return '[&>div]:bg-amber-500';
  return '';
}
