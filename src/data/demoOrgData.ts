import { 
  User, 
  Assignment, 
  Patient, 
  Zone, 
  AssignmentType,
  AssignmentStatus 
} from '@/types';
import { addDays, startOfWeek, isToday } from 'date-fns';

// Demo Organization: Spitex Hinterhölle
export const demoOrgName = 'Spitex Hinterhölle';

// Demo Employees for Hinterhölle
export const demoEmployees: User[] = [
  {
    id: 'demo-emp-1',
    email: 'maria@hinterhoelle.ch',
    name: 'Maria Müller',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'demo-emp-2',
    email: 'thomas@hinterhoelle.ch',
    name: 'Thomas Schmidt',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'demo-emp-3',
    email: 'anna@hinterhoelle.ch',
    name: 'Anna Weber',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'demo-emp-4',
    email: 'stefan@hinterhoelle.ch',
    name: 'Stefan Keller',
    role: 'employee',
    isActive: true,
    createdAt: new Date('2024-02-15'),
  },
];

// Demo Zones for Hinterhölle
export const demoZones: Zone[] = [
  { id: 'demo-zone-1', name: 'Altstadt', code: 'AS' },
  { id: 'demo-zone-2', name: 'Neustadt', code: 'NS' },
  { id: 'demo-zone-3', name: 'Industriequartier', code: 'IQ' },
  { id: 'demo-zone-4', name: 'Seeufer', code: 'SU' },
];

// Demo Clients (Klienten) for Hinterhölle
export const demoPatients: Patient[] = [
  { id: 'demo-pat-1', full_name: 'Friedrich Höllstein', phone: '044 666 11 11', city: 'Hinterhölle', notes: 'Türcode: 1234' },
  { id: 'demo-pat-2', full_name: 'Gertrude Feuer', phone: '044 666 22 22', city: 'Hinterhölle', notes: 'Schlüssel unter Fußmatte' },
  { id: 'demo-pat-3', full_name: 'Wolfgang Glut', phone: '044 666 33 33', city: 'Hinterhölle', notes: 'Hund im Haushalt - freundlich' },
  { id: 'demo-pat-4', full_name: 'Hedwig Flamm', phone: '044 666 44 44', city: 'Hinterhölle' },
  { id: 'demo-pat-5', full_name: 'Ernst Lohe', phone: '044 666 55 55', city: 'Hinterhölle', notes: 'Rollstuhlfahrer' },
  { id: 'demo-pat-6', full_name: 'Ingrid Asche', phone: '044 666 66 66', city: 'Hinterhölle', notes: 'Klingel defekt - anklopfen' },
];

// Employee colors for calendar (HEX values for consistency)
export const demoEmployeeColors: Record<string, string> = {
  'demo-emp-1': '#3b82f6', // blue
  'demo-emp-2': '#22c55e', // green
  'demo-emp-3': '#a855f7', // purple
  'demo-emp-4': '#f97316', // orange
};

// Generate demo assignments for Hinterhölle
export function generateDemoAssignments(): Assignment[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const assignments: Assignment[] = [];
  
  const types: AssignmentType[] = ['grundpflege', 'behandlungspflege', 'haushalt', 'abklaerung', 'privatleistungen'];
  const statuses: AssignmentStatus[] = ['planned', 'confirmed', 'in-progress', 'completed'];
  
  const morningSlots = [
    { start: '07:00', end: '08:00' },
    { start: '08:15', end: '09:15' },
    { start: '09:30', end: '10:30' },
    { start: '10:45', end: '11:45' },
  ];
  
  const afternoonSlots = [
    { start: '13:00', end: '14:00' },
    { start: '14:15', end: '15:15' },
    { start: '15:30', end: '16:30' },
    { start: '16:45', end: '17:45' },
  ];
  
  let id = 1;
  
  // Generate for weekdays
  for (let day = 0; day < 5; day++) {
    const date = addDays(weekStart, day);
    const isPast = date < new Date();
    
    demoEmployees.forEach((employee, empIndex) => {
      const numAssignments = 3 + (day % 2);
      const slots = [...morningSlots, ...afternoonSlots].slice(0, numAssignments);
      
      slots.forEach((slot, slotIndex) => {
        const patient = demoPatients[(empIndex + slotIndex + day) % demoPatients.length];
        const zone = demoZones[(empIndex + day) % demoZones.length];
        const type = types[(empIndex + slotIndex) % types.length];
        
        let status: AssignmentStatus = 'planned';
        if (isPast) {
          status = 'completed';
        } else if (isToday(date)) {
          status = slotIndex < 2 ? 'completed' : slotIndex === 2 ? 'in-progress' : 'confirmed';
        } else {
          status = statuses[slotIndex % 2];
        }
        
        assignments.push({
          id: `demo-asg-${id++}`,
          date,
          startTime: slot.start,
          endTime: slot.end,
          patientName: patient.full_name,
          patientId: patient.id,
          type,
          zone: zone.name,
          zoneId: zone.id,
          assignedEmployeeId: employee.id,
          assignedEmployeeName: employee.name,
          status,
          priority: (id % 7 === 0) ? 'urgent' : 'normal',
          internalNote: slotIndex === 0 ? 'Schlüssel beim Hausmeister' : undefined,
          employeeNote: patient.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });
  }
  
  // Add some weekend assignments
  [5, 6].forEach(day => {
    const date = addDays(weekStart, day);
    demoEmployees.slice(0, 2).forEach((employee, empIndex) => {
      const patient = demoPatients[empIndex];
      const zone = demoZones[empIndex];
      
      assignments.push({
        id: `demo-asg-${id++}`,
        date,
        startTime: '09:00',
        endTime: '10:30',
        patientName: patient.full_name,
        patientId: patient.id,
        type: 'grundpflege',
        zone: zone.name,
        zoneId: zone.id,
        assignedEmployeeId: employee.id,
        assignedEmployeeName: employee.name,
        status: 'confirmed',
        priority: 'normal',
        employeeNote: patient.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });
  
  return assignments;
}
