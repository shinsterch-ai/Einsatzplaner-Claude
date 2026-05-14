// User Roles
export type UserRole = 'admin' | 'dispatcher' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

// Assignment Status
export type AssignmentStatus = 
  | 'draft' 
  | 'planned' 
  | 'confirmed' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled';

// Assignment Types (Einsatzart)
export type AssignmentType = 
  | 'grundpflege' 
  | 'behandlungspflege' 
  | 'abklaerung' 
  | 'haushalt'
  | 'privatleistungen';

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  grundpflege: 'Grundpflege',
  behandlungspflege: 'Behandlungspflege',
  abklaerung: 'Abklärung',
  haushalt: 'Haushalt',
  privatleistungen: 'Privatleistungen',
};

// Recurrence types for recurring assignments
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom';

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Keine Wiederholung',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  custom: 'Benutzerdefiniert',
};

// Day of week constants for custom recurrence
export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'So',
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
};

export const WEEKDAY_FULL_LABELS: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
};

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  draft: 'Entwurf',
  planned: 'Geplant',
  confirmed: 'Bestätigt',
  'in-progress': 'Unterwegs',
  completed: 'Erledigt',
  cancelled: 'Storniert',
};

// Priority
export type Priority = 'normal' | 'urgent';

// Client (Klient) - identified by full_name
export interface Patient {
  id: string;
  full_name: string; // Name of the client (required, primary identifier)
  phone?: string; // Phone number
  city?: string; // Ort
  address?: string; // optional, internal only
  notes?: string; // e.g., "Türcode im Umschlag"
}

// Zone/Region
export interface Zone {
  id: string;
  name: string;
  code: string;
}

// Assignment (core data model)
export interface Assignment {
  id: string;
  date: Date | string;
  startTime: string; // HH:mm - actual scheduled time (may be null if not yet scheduled)
  endTime: string; // HH:mm - actual scheduled end time
  preferredStartTime?: string; // HH:mm - preferred window start
  preferredEndTime?: string; // HH:mm - preferred window end
  durationMinutes?: number; // Required duration in minutes
  patientName: string;
  patientId: string;
  patientAddress?: string; // Full address for travel time calculation
  type: AssignmentType;
  zone: string;
  zoneId: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  status: AssignmentStatus;
  internalNote?: string; // for dispatcher
  employeeNote?: string; // visible to employee
  priority: Priority;
  // Recurring assignment fields
  seriesId?: string; // links assignments in a series
  recurrence?: RecurrenceType;
  recurrenceEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// For calendar display
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  assignment: Assignment;
  employeeColor?: string;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: 'assignment_new' | 'assignment_changed' | 'assignment_cancelled';
  title: string;
  message: string;
  assignmentId?: string;
  isRead: boolean;
  createdAt: Date;
}

// Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entityType: 'assignment' | 'user' | 'patient' | 'zone' | 'type';
  entityId: string;
  changes: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}
