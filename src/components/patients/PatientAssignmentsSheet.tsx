import { useState } from 'react';
import { X, CalendarDays, Phone, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PatientAssignmentsList } from './PatientAssignmentsList';
import { AssignmentFormDialog } from '@/components/assignments/AssignmentFormDialog';
import { useAssignments, DbAssignment } from '@/hooks/use-assignments';
import { DbPatient } from '@/hooks/use-patients';
import { Assignment } from '@/types';
import { toast } from 'sonner';

interface PatientAssignmentsSheetProps {
  patient: DbPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientAssignmentsSheet({
  patient,
  open,
  onOpenChange,
}: PatientAssignmentsSheetProps) {
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  const { assignments, isLoading, deleteAssignment } = useAssignments();

  // Filter assignments for this patient
  const patientAssignments = patient
    ? assignments.filter((a) => a.patient_id === patient.id)
    : [];

  // Convert DbAssignment to Assignment for editing
  const handleEditAssignment = (dbAssignment: DbAssignment) => {
    const assignment: Assignment = {
      id: dbAssignment.id,
      date: dbAssignment.date,
      startTime: dbAssignment.start_time || dbAssignment.preferred_start_time,
      endTime: dbAssignment.end_time || dbAssignment.preferred_end_time,
      preferredStartTime: dbAssignment.preferred_start_time,
      preferredEndTime: dbAssignment.preferred_end_time,
      durationMinutes: dbAssignment.duration_minutes,
      patientName: dbAssignment.patient?.full_name || '',
      patientId: dbAssignment.patient_id,
      patientAddress: dbAssignment.patient?.address || undefined,
      type: dbAssignment.type as any,
      zone: dbAssignment.zone || '',
      zoneId: '',
      assignedEmployeeId: dbAssignment.assigned_employee_id || undefined,
      assignedEmployeeName: dbAssignment.assigned_employee?.full_name || undefined,
      status: dbAssignment.status.replace('_', '-') as any,
      internalNote: dbAssignment.internal_note || undefined,
      employeeNote: dbAssignment.employee_note || undefined,
      priority: dbAssignment.priority as any,
      seriesId: dbAssignment.series_id || undefined,
      recurrence: dbAssignment.recurrence as any,
      recurrenceEndDate: dbAssignment.recurrence_end_date ? new Date(dbAssignment.recurrence_end_date) : undefined,
      responsiblePersonId: dbAssignment.responsible_person_id || undefined,
      responsiblePersonName: dbAssignment.responsible_person?.full_name || undefined,
      createdAt: new Date(dbAssignment.created_at),
      updatedAt: new Date(dbAssignment.updated_at),
    };
    setEditingAssignment(assignment);
    setAssignmentDialogOpen(true);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment.mutateAsync(assignmentId);
      toast.success('Einsatz wurde gelöscht');
    } catch (error) {
      // Error is shown by hook
    }
  };

  if (!patient) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {patient.full_name || '(Ohne Name)'}
            </SheetTitle>
          </SheetHeader>

          {/* Patient info summary */}
          <div className="py-4 space-y-2 text-sm border-b">
            {patient.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{patient.address ? `${patient.address}, ${patient.city}` : patient.city}</span>
              </div>
            )}
            {patient.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 mt-0.5" />
                <span className="line-clamp-2">{patient.notes}</span>
              </div>
            )}
          </div>

          {/* Assignments list */}
          <div className="py-4">
            <h3 className="text-sm font-medium mb-3">
              Einsätze ({patientAssignments.length})
            </h3>
            <PatientAssignmentsList
              assignments={patientAssignments}
              isLoading={isLoading}
              onEdit={handleEditAssignment}
              onDelete={handleDeleteAssignment}
              isDeleting={deleteAssignment.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Assignment Edit Dialog */}
      <AssignmentFormDialog
        open={assignmentDialogOpen}
        onOpenChange={(open) => {
          setAssignmentDialogOpen(open);
          if (!open) setEditingAssignment(null);
        }}
        assignment={editingAssignment}
        onSave={() => {
          setAssignmentDialogOpen(false);
          setEditingAssignment(null);
        }}
      />
    </>
  );
}
