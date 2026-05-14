import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  parseISO, 
  format,
  eachDayOfInterval,
  getDay,
  differenceInCalendarDays
} from 'date-fns';
import { DbAssignment } from '@/hooks/use-assignments';
import { DayAvailability } from '@/components/employees/AvailabilitySchedule';

// ArG (Arbeitszeitgesetz) limits
const ARG_MAX_DAILY_HOURS = 10;
const ARG_MAX_WEEKLY_HOURS = 48;
const ARG_MIN_BREAK_AFTER_HOURS = 6;
const ARG_MIN_BREAK_MINUTES = 30;

const BASE_WEEKLY_HOURS = 40;
const WEEKS_PER_MONTH = 4.33;
const WORKING_DAYS_PER_WEEK = 5;

export interface ArGWarning {
  type: 'daily_limit' | 'weekly_limit' | 'break_missing' | 'consecutive_days';
  date: string;
  details: string;
  severity: 'warning' | 'error';
}

export interface DailyHoursSummary {
  date: string;
  hours: number;
  assignmentCount: number;
  violations: ArGWarning[];
}

export interface WorkingHoursAccount {
  employeeId: string;
  employeeName: string;
  workPercentage: number;
  
  // Target hours (Soll)
  weeklyTargetHours: number;
  monthlyTargetHours: number;
  yearlyTargetHours: number;
  
  // Worked hours (gearbeitete Stunden - completed/in_progress)
  monthlyWorkedHours: number;
  yearlyWorkedHours: number;
  
  // Planned hours (geplante Stunden - planned/confirmed/draft)
  monthlyPlannedHours: number;
  yearlyPlannedHours: number;
  
  // Total actual hours (Ist) - worked + planned
  monthlyActualHours: number;
  yearlyActualHours: number;
  
  // Overtime (Überstunden) - based on worked hours only
  monthlyOvertime: number;
  yearlyOvertime: number;
  
  // Vacation (Urlaub)
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  vacationDaysRemaining: number;
  
  // ArG compliance
  argWarnings: ArGWarning[];
  hasArgViolations: boolean;
  
  // Daily breakdown for current month
  dailySummary: DailyHoursSummary[];
}

interface EmployeeProfile {
  id: string;
  fullName: string | null;
  email: string;
  workPercentage: number | null;
  weeklyHours: number | null;
  availability: DayAvailability[];
  isSick?: boolean;
  vacationDaysTotal?: number;
  vacationDaysUsed?: number;
}

/**
 * Calculate hours from duration_minutes or start/end time
 */
function calculateAssignmentHours(assignment: DbAssignment): number {
  if (assignment.duration_minutes) {
    return assignment.duration_minutes / 60;
  }
  
  if (assignment.start_time && assignment.end_time) {
    const [startH, startM] = assignment.start_time.split(':').map(Number);
    const [endH, endM] = assignment.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  }
  
  return 0;
}

/**
 * Group assignments by date for an employee
 */
function groupAssignmentsByDate(
  assignments: DbAssignment[], 
  employeeId: string
): Map<string, DbAssignment[]> {
  const grouped = new Map<string, DbAssignment[]>();
  
  assignments
    .filter(a => a.assigned_employee_id === employeeId && a.status !== 'cancelled')
    .forEach(a => {
      const dateKey = a.date;
      const existing = grouped.get(dateKey) || [];
      existing.push(a);
      grouped.set(dateKey, existing);
    });
  
  return grouped;
}

/**
 * Check ArG violations for a specific day
 */
function checkDailyArGViolations(
  date: string, 
  assignments: DbAssignment[],
  totalHours: number
): ArGWarning[] {
  const warnings: ArGWarning[] = [];
  
  // Check daily hour limit (10h max)
  if (totalHours > ARG_MAX_DAILY_HOURS) {
    warnings.push({
      type: 'daily_limit',
      date,
      details: `${totalHours.toFixed(1)}h überschreitet das Maximum von ${ARG_MAX_DAILY_HOURS}h`,
      severity: 'error'
    });
  } else if (totalHours > ARG_MAX_DAILY_HOURS * 0.9) {
    warnings.push({
      type: 'daily_limit',
      date,
      details: `${totalHours.toFixed(1)}h nähert sich dem Maximum von ${ARG_MAX_DAILY_HOURS}h`,
      severity: 'warning'
    });
  }
  
  // Check for required breaks (after 6h work, 30min break required)
  if (totalHours > ARG_MIN_BREAK_AFTER_HOURS && assignments.length > 1) {
    // Sort assignments by start time
    const sorted = [...assignments].sort((a, b) => {
      const aTime = a.start_time || '00:00';
      const bTime = b.start_time || '00:00';
      return aTime.localeCompare(bTime);
    });
    
    // Check gaps between assignments
    let hasAdequateBreak = false;
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      if (current.end_time && next.start_time) {
        const [endH, endM] = current.end_time.split(':').map(Number);
        const [startH, startM] = next.start_time.split(':').map(Number);
        const gap = (startH * 60 + startM) - (endH * 60 + endM);
        
        if (gap >= ARG_MIN_BREAK_MINUTES) {
          hasAdequateBreak = true;
          break;
        }
      }
    }
    
    if (!hasAdequateBreak) {
      warnings.push({
        type: 'break_missing',
        date,
        details: `Bei ${totalHours.toFixed(1)}h Arbeitszeit fehlt die Pause von min. ${ARG_MIN_BREAK_MINUTES} Min.`,
        severity: 'warning'
      });
    }
  }
  
  return warnings;
}

/**
 * Check weekly hour limit violations
 */
function checkWeeklyArGViolations(
  weeklyHours: Map<string, number>
): ArGWarning[] {
  const warnings: ArGWarning[] = [];
  
  // Group by week
  const weeklyTotals = new Map<string, number>();
  weeklyHours.forEach((hours, date) => {
    const d = parseISO(date);
    const weekStart = format(startOfMonth(d), 'yyyy-MM-dd');
    const weekNumber = Math.floor(differenceInCalendarDays(d, parseISO(weekStart)) / 7);
    const weekKey = `${format(d, 'yyyy-MM')}-W${weekNumber}`;
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + hours);
  });
  
  weeklyTotals.forEach((total, week) => {
    if (total > ARG_MAX_WEEKLY_HOURS) {
      warnings.push({
        type: 'weekly_limit',
        date: week,
        details: `Woche ${week}: ${total.toFixed(1)}h überschreitet das Maximum von ${ARG_MAX_WEEKLY_HOURS}h`,
        severity: 'error'
      });
    }
  });
  
  return warnings;
}

/**
 * Hook to calculate working hours account for all employees
 */
export function useWorkingHoursAccount(
  employees: EmployeeProfile[],
  assignments: DbAssignment[],
  referenceDate: Date = new Date()
): WorkingHoursAccount[] {
  return useMemo(() => {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const yearStart = startOfYear(referenceDate);
    const yearEnd = endOfYear(referenceDate);
    
    // Get all days in current month for daily breakdown
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Filter assignments for different periods
    const filterByDateRange = (start: Date, end: Date) => 
      assignments.filter(a => {
        const d = typeof a.date === 'string' ? parseISO(a.date) : a.date;
        return d >= start && d <= end;
      });
    
    const monthAssignments = filterByDateRange(monthStart, monthEnd);
    const yearAssignments = filterByDateRange(yearStart, yearEnd);
    
    return employees.map(employee => {
      const workPercentage = employee.workPercentage ?? 100;
      const weeklyTargetHours = employee.weeklyHours ?? (BASE_WEEKLY_HOURS * workPercentage / 100);
      const monthlyTargetHours = Math.round(weeklyTargetHours * WEEKS_PER_MONTH * 10) / 10;
      
      // Calculate yearly target based on working days elapsed
      const daysElapsed = differenceInCalendarDays(
        new Date() > yearEnd ? yearEnd : new Date(),
        yearStart
      ) + 1;
      const workingDaysElapsed = Math.round(daysElapsed * (5/7)); // Approximate working days
      const yearlyTargetHours = Math.round(weeklyTargetHours * 52);
      
      // Group assignments by date
      const monthlyGrouped = groupAssignmentsByDate(monthAssignments, employee.id);
      const yearlyGrouped = groupAssignmentsByDate(yearAssignments, employee.id);
      
      // Worked statuses (completed, in_progress)
      const workedStatuses = ['completed', 'in_progress'];
      // Planned statuses (draft, planned, confirmed)
      const plannedStatuses = ['draft', 'planned', 'confirmed'];
      
      // Calculate hours by category
      let monthlyWorkedHours = 0;
      let monthlyPlannedHours = 0;
      let yearlyWorkedHours = 0;
      let yearlyPlannedHours = 0;
      
      const dailyHoursMap = new Map<string, number>();
      
      monthlyGrouped.forEach((dayAssignments, date) => {
        let dayTotal = 0;
        dayAssignments.forEach(a => {
          const hours = calculateAssignmentHours(a);
          dayTotal += hours;
          if (workedStatuses.includes(a.status)) {
            monthlyWorkedHours += hours;
          } else if (plannedStatuses.includes(a.status)) {
            monthlyPlannedHours += hours;
          }
        });
        dailyHoursMap.set(date, dayTotal);
      });
      
      yearlyGrouped.forEach((dayAssignments) => {
        dayAssignments.forEach(a => {
          const hours = calculateAssignmentHours(a);
          if (workedStatuses.includes(a.status)) {
            yearlyWorkedHours += hours;
          } else if (plannedStatuses.includes(a.status)) {
            yearlyPlannedHours += hours;
          }
        });
      });
      
      // Total actual hours (worked + planned)
      const monthlyActualHours = monthlyWorkedHours + monthlyPlannedHours;
      const yearlyActualHours = yearlyWorkedHours + yearlyPlannedHours;
      
      // Calculate overtime based on worked hours only
      const monthlyOvertime = Math.round((monthlyWorkedHours - monthlyTargetHours) * 10) / 10;
      const yearlyOvertime = Math.round((yearlyWorkedHours - yearlyTargetHours) * 10) / 10;
      
      // Vacation tracking
      const vacationDaysTotal = employee.vacationDaysTotal ?? 25;
      const vacationDaysUsed = employee.vacationDaysUsed ?? 0;
      const vacationDaysRemaining = vacationDaysTotal - vacationDaysUsed;
      
      // Check ArG violations
      const argWarnings: ArGWarning[] = [];
      
      // Daily violations
      monthlyGrouped.forEach((dayAssignments, date) => {
        const hours = dailyHoursMap.get(date) || 0;
        const dailyWarnings = checkDailyArGViolations(date, dayAssignments, hours);
        argWarnings.push(...dailyWarnings);
      });
      
      // Weekly violations
      const weeklyWarnings = checkWeeklyArGViolations(dailyHoursMap);
      argWarnings.push(...weeklyWarnings);
      
      // Build daily summary
      const dailySummary: DailyHoursSummary[] = monthDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayAssignments = monthlyGrouped.get(dateKey) || [];
        const hours = dailyHoursMap.get(dateKey) || 0;
        const violations = checkDailyArGViolations(dateKey, dayAssignments, hours);
        
        return {
          date: dateKey,
          hours: Math.round(hours * 10) / 10,
          assignmentCount: dayAssignments.length,
          violations
        };
      });
      
      return {
        employeeId: employee.id,
        employeeName: employee.fullName || employee.email,
        workPercentage,
        weeklyTargetHours: Math.round(weeklyTargetHours * 10) / 10,
        monthlyTargetHours,
        yearlyTargetHours,
        monthlyWorkedHours: Math.round(monthlyWorkedHours * 10) / 10,
        yearlyWorkedHours: Math.round(yearlyWorkedHours * 10) / 10,
        monthlyPlannedHours: Math.round(monthlyPlannedHours * 10) / 10,
        yearlyPlannedHours: Math.round(yearlyPlannedHours * 10) / 10,
        monthlyActualHours: Math.round(monthlyActualHours * 10) / 10,
        yearlyActualHours: Math.round(yearlyActualHours * 10) / 10,
        monthlyOvertime,
        yearlyOvertime,
        vacationDaysTotal,
        vacationDaysUsed,
        vacationDaysRemaining,
        argWarnings,
        hasArgViolations: argWarnings.some(w => w.severity === 'error'),
        dailySummary
      };
    });
  }, [employees, assignments, referenceDate]);
}

/**
 * Get overtime status color
 */
export function getOvertimeColor(overtime: number): string {
  if (overtime > 20) return 'text-destructive';
  if (overtime > 10) return 'text-amber-600';
  if (overtime > 0) return 'text-blue-600';
  if (overtime < -10) return 'text-amber-600';
  return 'text-muted-foreground';
}

/**
 * Get vacation status color
 */
export function getVacationColor(remaining: number, total: number): string {
  const percent = (remaining / total) * 100;
  if (remaining <= 0) return 'text-destructive';
  if (percent < 20) return 'text-amber-600';
  return 'text-green-600';
}
