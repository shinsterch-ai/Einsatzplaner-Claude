import { AlertTriangle, UserCheck, ArrowRight, X, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Assignment } from '@/types';
import { useMemo } from 'react';

interface TimeSlotSuggestion {
  startTime: string;
  endTime: string;
  label: string;
}

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictingAssignment: Assignment | null;
  draggedAssignment: Assignment | null;
  targetEmployeeName: string;
  availableEmployees: { id: string; name: string }[];
  onSelectAlternative: (employeeId: string, employeeName: string) => void;
  onSelectTimeShift: (newStartTime: string, newEndTime: string) => void;
  onIgnore: () => void;
  onCancel: () => void;
}

// Helper to add/subtract minutes from time string
function adjustTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  if (newH < 0 || newH >= 24) return time;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Calculate duration in minutes
function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function ConflictDialog({
  open,
  onOpenChange,
  conflictingAssignment,
  draggedAssignment,
  targetEmployeeName,
  availableEmployees,
  onSelectAlternative,
  onSelectTimeShift,
  onIgnore,
  onCancel,
}: ConflictDialogProps) {
  // Generate time slot suggestions
  const timeSlotSuggestions = useMemo((): TimeSlotSuggestion[] => {
    if (!conflictingAssignment || !draggedAssignment) return [];

    const duration = getDurationMinutes(draggedAssignment.startTime, draggedAssignment.endTime);
    const suggestions: TimeSlotSuggestion[] = [];

    // Before conflict: end when conflict starts
    const beforeEnd = conflictingAssignment.startTime;
    const beforeStart = adjustTime(beforeEnd, -duration);
    if (beforeStart >= '06:00') {
      suggestions.push({
        startTime: beforeStart,
        endTime: beforeEnd,
        label: `Vorher: ${beforeStart} – ${beforeEnd}`,
      });
    }

    // After conflict: start when conflict ends
    const afterStart = conflictingAssignment.endTime;
    const afterEnd = adjustTime(afterStart, duration);
    if (afterEnd <= '22:00') {
      suggestions.push({
        startTime: afterStart,
        endTime: afterEnd,
        label: `Nachher: ${afterStart} – ${afterEnd}`,
      });
    }

    return suggestions;
  }, [conflictingAssignment, draggedAssignment]);

  if (!conflictingAssignment) return null;

  const handleClose = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-destructive">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-destructive">
            Terminkonflikt!
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{targetEmployeeName}</strong> hat bereits einen Einsatz:
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground">
                  {conflictingAssignment.startTime} – {conflictingAssignment.endTime} Uhr
                </p>
                <p className="text-muted-foreground">
                  Klient: {conflictingAssignment.patientName}
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Time shift suggestions */}
          {timeSlotSuggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Zeit verschieben:
              </p>
              <div className="grid gap-2">
                {timeSlotSuggestions.map((slot, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="justify-between gap-2 border-blue-500/50 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                    onClick={() => {
                      onSelectTimeShift(slot.startTime, slot.endTime);
                      onOpenChange(false);
                    }}
                  >
                    <span>{slot.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Employee suggestions */}
          {availableEmployees.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Stattdessen zuweisen an:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                {availableEmployees.slice(0, 6).map(emp => (
                  <Button
                    key={emp.id}
                    variant="outline"
                    size="sm"
                    className="justify-between gap-2 border-primary/50 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      onSelectAlternative(emp.id, emp.name);
                      onOpenChange(false);
                    }}
                  >
                    {emp.name}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                ))}
              </div>
              {availableEmployees.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{availableEmployees.length - 6} weitere verfügbar
                </p>
              )}
            </div>
          )}

          {availableEmployees.length === 0 && timeSlotSuggestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center italic py-2">
              Keine Alternativen verfügbar.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onIgnore();
                onOpenChange(false);
              }}
              className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              <AlertCircle className="h-4 w-4" />
              Trotzdem verschieben
            </Button>
          </div>

          {/* Warning about save blocking */}
          <p className="text-xs text-center text-destructive/80 bg-destructive/5 rounded p-2">
            ⚠️ Der Plan kann nicht gespeichert werden, solange Konflikte bestehen!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}