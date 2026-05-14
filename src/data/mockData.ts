import { 
  User, 
  Assignment, 
  Patient, 
  Zone, 
  Notification,
  AssignmentType,
  AssignmentStatus 
} from '@/types';
import { addDays, setHours, setMinutes, startOfWeek } from 'date-fns';

// Get the start of current week (Monday)
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@spitex.ch',
    name: 'Anna Müller',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'dispo@spitex.ch',
    name: 'Thomas Weber',
    role: 'dispatcher',
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-3',
    email: 'maria@spitex.ch',
    name: 'Maria Schmidt',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'user-4',
    email: 'peter@spitex.ch',
    name: 'Peter Keller',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: 'user-5',
    email: 'lisa@spitex.ch',
    name: 'Lisa Brunner',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-03-01'),
  },
];

// Mock Zones
export const mockZones: Zone[] = [
  { id: 'zone-1', name: 'Kreis 1', code: 'K1' },
  { id: 'zone-2', name: 'Kreis 3', code: 'K3' },
  { id: 'zone-3', name: 'Kreis 6', code: 'K6' },
  { id: 'zone-4', name: 'Oerlikon', code: 'OE' },
  { id: 'zone-5', name: 'Seefeld', code: 'SF' },
];

// Mock Clients (Klienten) - with addresses for travel time calculation
export const mockPatients: Patient[] = [
  { id: 'pat-1', full_name: 'Hans Müller', phone: '044 123 45 67', city: 'Zürich', address: 'Bahnhofstrasse 10, 8001 Zürich', notes: 'Türcode: 4521' },
  { id: 'pat-2', full_name: 'Maria Schneider', phone: '044 234 56 78', city: 'Oerlikon', address: 'Schaffhauserstrasse 100, 8050 Zürich', notes: 'Schlüssel bei Nachbar (2. Stock)' },
  { id: 'pat-3', full_name: 'Peter Huber', phone: '044 345 67 89', city: 'Zürich', address: 'Seefeldstrasse 50, 8008 Zürich', notes: 'Hund im Haushalt' },
  { id: 'pat-4', full_name: 'Elisabeth Weber', phone: '052 123 45 67', city: 'Winterthur', address: 'Marktgasse 20, 8400 Winterthur' },
  { id: 'pat-5', full_name: 'Thomas Brunner', phone: '044 456 78 90', city: 'Zürich', address: 'Bellerivestrasse 25, 8008 Zürich', notes: 'Klingel defekt, bitte anklopfen' },
  { id: 'pat-6', full_name: 'Ursula Meier', phone: '044 567 89 01', city: 'Oerlikon', address: 'Thurgauerstrasse 60, 8050 Zürich' },
  { id: 'pat-7', full_name: 'Rudolf Fischer', phone: '052 234 56 78', city: 'Winterthur', address: 'Stadthausstrasse 8, 8400 Winterthur', notes: 'Rollstuhl' },
];

// Helper to get address for patient
export const getPatientAddress = (patientId: string): string | undefined => {
  return mockPatients.find(p => p.id === patientId)?.address;
};

// Helper to create date with time
const createDateTime = (dayOffset: number, hour: number, minute: number = 0): Date => {
  const date = addDays(weekStart, dayOffset);
  return setMinutes(setHours(date, hour), minute);
};

// Mock Assignments - with patientAddress for travel time
export const mockAssignments: Assignment[] = [
  // Monday
  {
    id: 'asg-1',
    date: addDays(weekStart, 0),
    startTime: '08:00',
    endTime: '09:30',
    patientName: 'Hans Müller',
    patientId: 'pat-1',
    patientAddress: 'Bahnhofstrasse 10, 8001 Zürich',
    type: 'grundpflege',
    zone: 'Kreis 6',
    zoneId: 'zone-3',
    assignedEmployeeId: 'user-3',
    assignedEmployeeName: 'Maria Schmidt',
    status: 'confirmed',
    employeeNote: 'Türcode: 4521',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'asg-2',
    date: addDays(weekStart, 0),
    startTime: '10:00',
    endTime: '11:00',
    patientName: 'Maria Schneider',
    patientId: 'pat-2',
    patientAddress: 'Schaffhauserstrasse 100, 8050 Zürich',
    type: 'behandlungspflege',
    zone: 'Oerlikon',
    zoneId: 'zone-4',
    assignedEmployeeId: 'user-3',
    assignedEmployeeName: 'Maria Schmidt',
    status: 'planned',
    employeeNote: 'Schlüssel bei Nachbar',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'asg-3',
    date: addDays(weekStart, 0),
    startTime: '09:00',
    endTime: '10:30',
    patientName: 'Peter Huber',
    patientId: 'pat-3',
    patientAddress: 'Seefeldstrasse 50, 8008 Zürich',
    type: 'haushalt',
    zone: 'Seefeld',
    zoneId: 'zone-5',
    assignedEmployeeId: 'user-4',
    assignedEmployeeName: 'Peter Keller',
    status: 'confirmed',
    employeeNote: 'Hund im Haushalt',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Tuesday
  {
    id: 'asg-4',
    date: addDays(weekStart, 1),
    startTime: '08:30',
    endTime: '10:00',
    patientName: 'Elisabeth Weber',
    patientId: 'pat-4',
    patientAddress: 'Marktgasse 20, 8400 Winterthur',
    type: 'grundpflege',
    zone: 'Kreis 3',
    zoneId: 'zone-2',
    assignedEmployeeId: 'user-5',
    assignedEmployeeName: 'Lisa Brunner',
    status: 'planned',
    priority: 'urgent',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'asg-5',
    date: addDays(weekStart, 1),
    startTime: '11:00',
    endTime: '12:00',
    patientName: 'Thomas Brunner',
    patientId: 'pat-5',
    patientAddress: 'Bellerivestrasse 25, 8008 Zürich',
    type: 'abklaerung',
    zone: 'Seefeld',
    zoneId: 'zone-5',
    assignedEmployeeId: 'user-3',
    assignedEmployeeName: 'Maria Schmidt',
    status: 'draft',
    employeeNote: 'Klingel defekt',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Wednesday
  {
    id: 'asg-6',
    date: addDays(weekStart, 2),
    startTime: '07:30',
    endTime: '09:00',
    patientName: 'Ursula Meier',
    patientId: 'pat-6',
    patientAddress: 'Thurgauerstrasse 60, 8050 Zürich',
    type: 'behandlungspflege',
    zone: 'Oerlikon',
    zoneId: 'zone-4',
    assignedEmployeeId: 'user-4',
    assignedEmployeeName: 'Peter Keller',
    status: 'confirmed',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'asg-7',
    date: addDays(weekStart, 2),
    startTime: '09:30',
    endTime: '11:00',
    patientName: 'Rudolf Fischer',
    patientId: 'pat-7',
    patientAddress: 'Stadthausstrasse 8, 8400 Winterthur',
    type: 'grundpflege',
    zone: 'Kreis 1',
    zoneId: 'zone-1',
    assignedEmployeeId: 'user-5',
    assignedEmployeeName: 'Lisa Brunner',
    status: 'planned',
    employeeNote: 'Rollstuhl',
    priority: 'urgent',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Thursday
  {
    id: 'asg-8',
    date: addDays(weekStart, 3),
    startTime: '08:00',
    endTime: '09:30',
    patientName: 'Hans Müller',
    patientId: 'pat-1',
    patientAddress: 'Bahnhofstrasse 10, 8001 Zürich',
    type: 'grundpflege',
    zone: 'Kreis 6',
    zoneId: 'zone-3',
    assignedEmployeeId: 'user-3',
    assignedEmployeeName: 'Maria Schmidt',
    status: 'planned',
    employeeNote: 'Türcode: 4521',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Friday
  {
    id: 'asg-9',
    date: addDays(weekStart, 4),
    startTime: '10:00',
    endTime: '11:30',
    patientName: 'Peter Huber',
    patientId: 'pat-3',
    patientAddress: 'Seefeldstrasse 50, 8008 Zürich',
    type: 'privatleistungen',
    zone: 'Seefeld',
    zoneId: 'zone-5',
    assignedEmployeeId: 'user-4',
    assignedEmployeeName: 'Peter Keller',
    status: 'planned',
    employeeNote: 'Hund im Haushalt',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Saturday
  {
    id: 'asg-10',
    date: addDays(weekStart, 5),
    startTime: '09:00',
    endTime: '10:00',
    patientName: 'Maria Schneider',
    patientId: 'pat-2',
    patientAddress: 'Schaffhauserstrasse 100, 8050 Zürich',
    type: 'grundpflege',
    zone: 'Oerlikon',
    zoneId: 'zone-4',
    assignedEmployeeId: 'user-5',
    assignedEmployeeName: 'Lisa Brunner',
    status: 'confirmed',
    employeeNote: 'Schlüssel bei Nachbar',
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-3',
    type: 'assignment_new',
    title: 'Neuer Einsatz',
    message: 'Neuer Einsatz am Mo, 08:00 - P-024',
    assignmentId: 'asg-1',
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: 'notif-2',
    userId: 'user-3',
    type: 'assignment_changed',
    title: 'Einsatz geändert',
    message: 'Einsatz am Di wurde auf 11:00 verschoben',
    assignmentId: 'asg-5',
    isRead: true,
    createdAt: new Date(),
  },
];

// Assignment type configuration
export const assignmentTypes: { id: AssignmentType; label: string; color: string }[] = [
  { id: 'grundpflege', label: 'Grundpflege', color: 'type-grundpflege' },
  { id: 'behandlungspflege', label: 'Behandlungspflege', color: 'type-behandlungspflege' },
  { id: 'abklaerung', label: 'Abklärung', color: 'type-abklaerung' },
  { id: 'haushalt', label: 'Haushalt', color: 'type-haushalt' },
  { id: 'privatleistungen', label: 'Privatleistungen', color: 'type-privatleistungen' },
];

// Employee colors for calendar (HEX values for consistency)
export const employeeColors: Record<string, string> = {
  'user-3': '#3b82f6', // blue
  'user-4': '#22c55e', // green
  'user-5': '#a855f7', // purple
};
