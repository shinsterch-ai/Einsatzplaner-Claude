import { useMemo } from "react";
import { useSchedulingRules, SchedulingRule, SchedulingRuleType } from "./use-scheduling-rules";
import { Assignment } from "@/types";
import { format, parseISO, differenceInHours, isWeekend, isSaturday, isSunday, addDays, subDays, getDay, getISOWeek } from "date-fns";
import { DayAvailability, WeekPattern } from "./use-employees";

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: SchedulingRuleType | "availability" | "vacation";
  category: "hard" | "soft";
  message: string;
  assignmentId: string;
  employeeId: string;
  date: string;
}

export interface VacationPeriod {
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  availability?: DayAvailability[];
}

function calculateAssignmentHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
}

function checkMaxHoursPerDay(
  rule: SchedulingRule,
  assignments: Assignment[],
  employeeId: string,
  date: Date
): RuleViolation | null {
  const maxHours = (rule.parameters.max_hours as number) || 10;
  const dateStr = format(date, "yyyy-MM-dd");
  
  const dayAssignments = assignments.filter(
    a => a.assignedEmployeeId === employeeId && format(a.date, "yyyy-MM-dd") === dateStr
  );
  
  const totalHours = dayAssignments.reduce((sum, a) => sum + calculateAssignmentHours(a.startTime, a.endTime), 0);
  
  if (totalHours > maxHours) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `${totalHours.toFixed(1)}h geplant (max. ${maxHours}h)`,
      assignmentId: dayAssignments[dayAssignments.length - 1]?.id || "",
      employeeId,
      date: dateStr,
    };
  }
  return null;
}

function checkMinBreakBetweenShifts(
  rule: SchedulingRule,
  assignments: Assignment[],
  assignment: Assignment
): RuleViolation | null {
  if (!assignment.assignedEmployeeId) return null;
  
  const minHours = (rule.parameters.min_hours as number) || 11;
  const assignmentDate = assignment.date;
  const prevDay = subDays(assignmentDate, 1);
  
  // Get previous day's assignments for this employee
  const prevDayAssignments = assignments.filter(
    a => a.assignedEmployeeId === assignment.assignedEmployeeId && 
         format(a.date, "yyyy-MM-dd") === format(prevDay, "yyyy-MM-dd")
  );
  
  if (prevDayAssignments.length === 0) return null;
  
  // Find the latest end time from previous day
  const latestEndTime = prevDayAssignments.reduce((latest, a) => {
    const [h, m] = a.endTime.split(":").map(Number);
    const minutes = h * 60 + m;
    return minutes > latest ? minutes : latest;
  }, 0);
  
  // Current assignment start time
  const [startH, startM] = assignment.startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  
  // Calculate break: hours from end of previous day to start of current day
  const breakHours = (24 * 60 - latestEndTime + startMinutes) / 60;
  
  if (breakHours < minHours) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `Nur ${breakHours.toFixed(1)}h Pause (min. ${minHours}h)`,
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(assignmentDate, "yyyy-MM-dd"),
    };
  }
  return null;
}

function checkNoWeekendWork(
  rule: SchedulingRule,
  assignment: Assignment
): RuleViolation | null {
  if (!assignment.assignedEmployeeId) return null;
  
  const includeSaturday = rule.parameters.include_saturday !== false;
  const includeSunday = rule.parameters.include_sunday !== false;
  
  // Check if rule applies to this employee
  if (rule.applies_to_employee_ids && !rule.applies_to_employee_ids.includes(assignment.assignedEmployeeId)) {
    return null;
  }
  
  const date = assignment.date;
  const isSat = isSaturday(date);
  const isSun = isSunday(date);
  
  if ((includeSaturday && isSat) || (includeSunday && isSun)) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `Wochenenddienst nicht erlaubt (${isSat ? "Samstag" : "Sonntag"})`,
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(date, "yyyy-MM-dd"),
    };
  }
  return null;
}

function checkMaxHoursPerWeek(
  rule: SchedulingRule,
  assignments: Assignment[],
  employeeId: string,
  weekStart: Date,
  weekEnd: Date
): RuleViolation | null {
  const maxHours = (rule.parameters.max_hours as number) || 42;
  
  const weekAssignments = assignments.filter(a => {
    if (a.assignedEmployeeId !== employeeId) return false;
    const aDate = a.date;
    return aDate >= weekStart && aDate <= weekEnd;
  });
  
  const totalHours = weekAssignments.reduce(
    (sum, a) => sum + calculateAssignmentHours(a.startTime, a.endTime),
    0
  );
  
  if (totalHours > maxHours) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `${totalHours.toFixed(1)}h/Woche geplant (max. ${maxHours}h)`,
      assignmentId: weekAssignments[0]?.id || "",
      employeeId,
      date: format(weekStart, "yyyy-MM-dd"),
    };
  }
  return null;
}

function checkMaxPatientsPerDay(
  rule: SchedulingRule,
  assignments: Assignment[],
  employeeId: string,
  date: Date
): RuleViolation | null {
  const maxPatients = (rule.parameters.max_patients as number) || 8;
  const dateStr = format(date, "yyyy-MM-dd");
  
  const dayAssignments = assignments.filter(
    a => a.assignedEmployeeId === employeeId && format(a.date, "yyyy-MM-dd") === dateStr
  );
  
  const uniquePatients = new Set(dayAssignments.map(a => a.patientId));
  
  if (uniquePatients.size > maxPatients) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `${uniquePatients.size} Patienten geplant (max. ${maxPatients})`,
      assignmentId: dayAssignments[dayAssignments.length - 1]?.id || "",
      employeeId,
      date: dateStr,
    };
  }
  return null;
}

function checkNoNightShifts(
  rule: SchedulingRule,
  assignment: Assignment
): RuleViolation | null {
  if (!assignment.assignedEmployeeId) return null;
  
  const afterTime = (rule.parameters.after_time as string) || "20:00";
  const [limitH, limitM] = afterTime.split(":").map(Number);
  const [endH, endM] = assignment.endTime.split(":").map(Number);
  
  // Check if rule applies to this employee
  if (rule.applies_to_employee_ids && !rule.applies_to_employee_ids.includes(assignment.assignedEmployeeId)) {
    return null;
  }
  
  if (endH * 60 + endM > limitH * 60 + limitM) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type,
      category: rule.rule_category,
      message: `Einsatz endet nach ${afterTime} Uhr`,
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(assignment.date, "yyyy-MM-dd"),
    };
  }
  return null;
}

// Convert JS day (0=Sunday) to availability day (0=Monday)
function jsToAvailabilityDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Check if week matches pattern
function isWeekMatchingPattern(date: Date, pattern: WeekPattern): boolean {
  if (pattern === 'every') return true;
  const weekNumber = getISOWeek(date);
  const isEvenWeek = weekNumber % 2 === 0;
  return pattern === 'even' ? isEvenWeek : !isEvenWeek;
}

function checkAvailability(
  assignment: Assignment,
  employee: Employee | undefined
): RuleViolation | null {
  if (!assignment.assignedEmployeeId || !employee?.availability || employee.availability.length === 0) {
    return null;
  }

  const assignmentDate = typeof assignment.date === 'string' ? new Date(assignment.date) : assignment.date;
  const jsDay = getDay(assignmentDate); // 0 = Sunday
  const availDay = jsToAvailabilityDay(jsDay);
  
  const dayAvail = employee.availability.find(a => a.dayOfWeek === availDay);
  
  // Day not in schedule or marked as unavailable
  if (!dayAvail || !dayAvail.isAvailable) {
    return {
      ruleId: "availability",
      ruleName: "Verfügbarkeit",
      ruleType: "availability",
      category: "soft",
      message: "Nicht verfügbar an diesem Tag",
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(assignmentDate, "yyyy-MM-dd"),
    };
  }

  // Check week pattern
  if (!isWeekMatchingPattern(assignmentDate, dayAvail.weekPattern)) {
    const patternLabel = dayAvail.weekPattern === 'even' ? 'geraden' : 'ungeraden';
    return {
      ruleId: "availability",
      ruleName: "Verfügbarkeit",
      ruleType: "availability",
      category: "soft",
      message: `Nur in ${patternLabel} Kalenderwochen`,
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(assignmentDate, "yyyy-MM-dd"),
    };
  }

  // Check time window - only if we have valid times
  const availStart = dayAvail.startTime;
  const availEnd = dayAvail.endTime;
  
  // Skip time window check if assignment times are not set or invalid
  if (!assignment.startTime || !assignment.endTime) {
    return null;
  }
  
  // Only compare if both times look like valid time strings (HH:mm format)
  const timeRegex = /^\d{2}:\d{2}/;
  if (!timeRegex.test(assignment.startTime) || !timeRegex.test(assignment.endTime)) {
    return null;
  }
  
  if (assignment.startTime < availStart || assignment.endTime > availEnd) {
    return {
      ruleId: "availability",
      ruleName: "Verfügbarkeit",
      ruleType: "availability",
      category: "soft",
      message: `Arbeitszeit: ${availStart.slice(0, 5)} - ${availEnd.slice(0, 5)}`,
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: format(assignmentDate, "yyyy-MM-dd"),
    };
  }

  return null;
}

/**
 * Check if employee is on vacation for a given assignment
 */
function checkVacation(
  assignment: Assignment,
  vacations: VacationPeriod[]
): RuleViolation | null {
  if (!assignment.assignedEmployeeId) return null;
  
  const assignmentDate = typeof assignment.date === 'string' 
    ? assignment.date 
    : format(assignment.date, "yyyy-MM-dd");
  
  const vacation = vacations.find(v => 
    v.employeeId === assignment.assignedEmployeeId &&
    v.status === 'approved' &&
    v.startDate <= assignmentDate &&
    v.endDate >= assignmentDate
  );
  
  if (vacation) {
    return {
      ruleId: "vacation",
      ruleName: "Ferien",
      ruleType: "vacation",
      category: "hard",
      message: "Mitarbeiter ist in den Ferien",
      assignmentId: assignment.id,
      employeeId: assignment.assignedEmployeeId,
      date: assignmentDate,
    };
  }
  
  return null;
}

export function useRuleViolations(
  assignments: Assignment[],
  employees: Employee[],
  weekStart: Date,
  weekEnd: Date,
  vacations: VacationPeriod[] = []
) {
  const { data: rules } = useSchedulingRules();

  // Build employee map for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [employees]);

  const violations = useMemo(() => {
    const allViolations: RuleViolation[] = [];
    
    // Always check availability and vacation, even without rules
    for (const assignment of assignments) {
      if (!assignment.assignedEmployeeId) continue;
      
      // Check availability
      const employee = employeeMap.get(assignment.assignedEmployeeId);
      const availViolation = checkAvailability(assignment, employee);
      if (availViolation) {
        allViolations.push(availViolation);
      }
      
      // Check vacation
      const vacationViolation = checkVacation(assignment, vacations);
      if (vacationViolation) {
        allViolations.push(vacationViolation);
      }
    }
    
    if (!rules || rules.length === 0) {
      return allViolations;
    }

    const activeRules = rules.filter(r => r.is_active);

    // Check each assignment against applicable rules
    for (const assignment of assignments) {
      if (!assignment.assignedEmployeeId) continue;

      for (const rule of activeRules) {
        // Skip if rule applies to specific employees and this isn't one of them
        if (rule.applies_to_employee_ids && 
            rule.applies_to_employee_ids.length > 0 && 
            !rule.applies_to_employee_ids.includes(assignment.assignedEmployeeId)) {
          continue;
        }

        let violation: RuleViolation | null = null;

        switch (rule.rule_type) {
          case "min_break_between_shifts":
            violation = checkMinBreakBetweenShifts(rule, assignments, assignment);
            break;
          case "no_weekend_work":
            violation = checkNoWeekendWork(rule, assignment);
            break;
          case "no_night_shifts":
            violation = checkNoNightShifts(rule, assignment);
            break;
        }

        if (violation) {
          allViolations.push(violation);
        }
      }
    }

    // Check aggregate rules per employee per day/week
    const employeeIds = [...new Set(assignments.map(a => a.assignedEmployeeId).filter(Boolean))] as string[];
    
    for (const employeeId of employeeIds) {
      // Generate dates in the week
      const dates: Date[] = [];
      let currentDate = new Date(weekStart);
      while (currentDate <= weekEnd) {
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, 1);
      }

      for (const rule of activeRules) {
        if (rule.applies_to_employee_ids && 
            rule.applies_to_employee_ids.length > 0 && 
            !rule.applies_to_employee_ids.includes(employeeId)) {
          continue;
        }

        switch (rule.rule_type) {
          case "max_hours_per_day":
            for (const date of dates) {
              const violation = checkMaxHoursPerDay(rule, assignments, employeeId, date);
              if (violation) allViolations.push(violation);
            }
            break;
          case "max_hours_per_week":
            const weekViolation = checkMaxHoursPerWeek(rule, assignments, employeeId, weekStart, weekEnd);
            if (weekViolation) allViolations.push(weekViolation);
            break;
          case "max_patients_per_day":
            for (const date of dates) {
              const violation = checkMaxPatientsPerDay(rule, assignments, employeeId, date);
              if (violation) allViolations.push(violation);
            }
            break;
        }
      }
    }

    return allViolations;
  }, [rules, assignments, employeeMap, weekStart, weekEnd, vacations]);

  // Group violations by assignment ID for easy lookup
  const violationsByAssignment = useMemo(() => {
    const map = new Map<string, RuleViolation[]>();
    for (const v of violations) {
      if (!map.has(v.assignmentId)) {
        map.set(v.assignmentId, []);
      }
      map.get(v.assignmentId)!.push(v);
    }
    return map;
  }, [violations]);

  // Group violations by employee and date
  const violationsByEmployeeDate = useMemo(() => {
    const map = new Map<string, RuleViolation[]>();
    for (const v of violations) {
      const key = `${v.employeeId}-${v.date}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(v);
    }
    return map;
  }, [violations]);

  const hardViolations = violations.filter(v => v.category === "hard");
  const softViolations = violations.filter(v => v.category === "soft");

  return {
    violations,
    violationsByAssignment,
    violationsByEmployeeDate,
    hardViolations,
    softViolations,
    hasHardViolations: hardViolations.length > 0,
    hasSoftViolations: softViolations.length > 0,
  };
}
