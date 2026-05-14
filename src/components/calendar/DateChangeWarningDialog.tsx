import { Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
import { Assignment } from '@/types';

interface DateChangeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
  originalDate: Date | null;
  targetDate: Date | null;
  targetEmployeeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DateChangeWarningDialog({
  open,
  onOpenChange,
  assignment,
  originalDate,
  targetDate,
  targetEmployeeName,
  onConfirm,
  onCancel,
}: DateChangeWarningDialogProps) {
  if (!assignment || !originalDate || !targetDate) return null;

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-amber-700">
              Datumsänderung
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sie verschieben den Einsatz <strong>{assignment.patientName}</strong> auf einen anderen Tag:
            </p>
            <div className="flex items-center justify-center gap-4 py-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Von</span>
                </div>
                <p className="font-semibold text-foreground mt-1">
                  {format(new Date(originalDate), 'EEEE, d. MMM', { locale: de })}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-600" />
              <div className="text-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Nach</span>
                </div>
                <p className="font-semibold text-amber-700 mt-1">
                  {format(new Date(targetDate), 'EEEE, d. MMM', { locale: de })}
                </p>
              </div>
            </div>
            <p className="text-sm">
              Mitarbeiter: <strong>{targetEmployeeName}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Stellen Sie sicher, dass der Patient über die Terminänderung informiert wird.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Trotzdem verschieben
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
