import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, Edit, Trash2, User, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DbAssignment } from '@/hooks/use-assignments';
import { ASSIGNMENT_TYPE_LABELS, AssignmentType, STATUS_LABELS, AssignmentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface PatientAssignmentsListProps {
  assignments: DbAssignment[];
  isLoading: boolean;
  onEdit: (assignment: DbAssignment) => void;
  onDelete: (assignmentId: string) => void;
  isDeleting?: boolean;
}

export function PatientAssignmentsList({
  assignments,
  isLoading,
  onEdit,
  onDelete,
  isDeleting = false,
}: PatientAssignmentsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'planned':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Convert DB status to UI status type
  const mapStatus = (dbStatus: string): AssignmentStatus => {
    return dbStatus.replace('_', '-') as AssignmentStatus;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Keine Einsätze vorhanden</p>
      </div>
    );
  }

  // Group assignments by date
  const groupedByDate = assignments.reduce((acc, assignment) => {
    const dateKey = assignment.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(assignment);
    return acc;
  }, {} as Record<string, DbAssignment[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <>
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        {sortedDates.map((dateKey) => (
          <div key={dateKey} className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground sticky top-0 bg-background py-1">
              {format(parseISO(dateKey), 'EEEE, d. MMMM yyyy', { locale: de })}
            </div>
            {groupedByDate[dateKey].map((assignment) => {
              const status = mapStatus(assignment.status);
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm border"
                >
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />
                      {assignment.start_time?.slice(0, 5) || assignment.preferred_start_time.slice(0, 5)}
                      {' - '}
                      {assignment.end_time?.slice(0, 5) || assignment.preferred_end_time.slice(0, 5)}
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium shrink-0">
                      {formatDuration(assignment.duration_minutes)}
                    </span>
                    <span className="px-2 py-0.5 bg-background rounded text-xs shrink-0">
                      {ASSIGNMENT_TYPE_LABELS[assignment.type as AssignmentType]}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs shrink-0', getStatusColor(status))}
                    >
                      {STATUS_LABELS[status]}
                    </Badge>
                    {assignment.assigned_employee?.full_name && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs truncate">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{assignment.assigned_employee.full_name}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(assignment)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(assignment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einsatz löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Einsatz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
