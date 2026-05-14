import { Assignment, STATUS_LABELS, ASSIGNMENT_TYPE_LABELS, AssignmentStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';
import {
  Clock,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
  MessageSquare,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Navigation,
  Pause,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AssignmentDetailSheetProps {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (assignment: Assignment) => void;
  onStatusChange?: (assignment: Assignment, newStatus: AssignmentStatus) => void;
  onDelete?: (assignment: Assignment) => void;
  onDeleteSeries?: (seriesId: string) => void;
}

export function AssignmentDetailSheet({
  assignment,
  open,
  onOpenChange,
  onEdit,
  onStatusChange,
  onDelete,
  onDeleteSeries,
}: AssignmentDetailSheetProps) {
  const { hasRole } = useAuth();
  const isEmployee = hasRole(['mitarbeiter']);
  const canEdit = hasRole(['admin', 'planer', 'superadmin']);

  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSeriesConfirm, setShowDeleteSeriesConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!assignment) return null;

  const handleStatusChange = (newStatus: AssignmentStatus) => {
    onStatusChange?.(assignment, newStatus);
  };

  const handleDelete = () => {
    onDelete?.(assignment);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleDeleteSeries = () => {
    if (assignment.seriesId) {
      onDeleteSeries?.(assignment.seriesId);
    }
    setShowDeleteSeriesConfirm(false);
    onOpenChange(false);
  };

  const isRecurring = !!assignment.seriesId;

  const handleCancel = () => {
    onStatusChange?.(assignment, 'cancelled');
    setShowCancelConfirm(false);
  };

  // Determine which action buttons to show based on current status
  const canPause = ['in-progress', 'confirmed', 'planned'].includes(assignment.status);
  const canComplete = ['in-progress', 'confirmed', 'planned'].includes(assignment.status);
  const canCancel = assignment.status !== 'cancelled' && assignment.status !== 'completed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:max-w-[450px] overflow-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{assignment.patientName}</SheetTitle>
            {canEdit && onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => onEdit(assignment)}
              >
                <Edit className="h-4 w-4" />
                Bearbeiten
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TypeBadge type={assignment.type} />
            <StatusBadge status={assignment.status} />
            {assignment.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent text-xs font-medium">
                <AlertTriangle className="h-3 w-3" />
                Dringend
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Time & Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(assignment.date), 'EEEE, d. MMMM yyyy', { locale: de })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>{assignment.startTime} - {assignment.endTime} Uhr</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.zone || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {assignment.zone || 'Kein Ort'}
                <Navigation className="h-3.5 w-3.5" />
              </a>
            </div>
            {assignment.assignedEmployeeName && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>{assignment.assignedEmployeeName}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Action Buttons */}
          {(canEdit || isEmployee) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Schnellaktionen</h4>
              <div className="grid grid-cols-2 gap-2">
                {canPause && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-auto py-3"
                    onClick={() => handleStatusChange('planned')}
                  >
                    <Pause className="h-4 w-4 text-amber-600" />
                    <span className="text-xs">Pausieren</span>
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-auto py-3"
                    onClick={() => handleStatusChange('completed')}
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Abschliessen</span>
                  </Button>
                )}
                {canCancel && (
                  <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 h-auto py-3"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs">Stornieren</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Einsatz stornieren?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchten Sie den Einsatz für <strong>{assignment.patientName}</strong> am{' '}
                          {format(new Date(assignment.date), 'd. MMMM yyyy', { locale: de })} wirklich stornieren?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Stornieren
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              
              {/* Delete Buttons - Only for admins/planers */}
              {canEdit && onDelete && (
                <div className="space-y-2">
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isRecurring ? 'Nur diesen Einsatz löschen' : 'Einsatz löschen'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Einsatz löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchten Sie den Einsatz für <strong>{assignment.patientName}</strong> am{' '}
                          {format(new Date(assignment.date), 'd. MMMM yyyy', { locale: de })} wirklich löschen?
                          Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {isRecurring && onDeleteSeries && (
                    <AlertDialog open={showDeleteSeriesConfirm} onOpenChange={setShowDeleteSeriesConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                          Alle wiederkehrenden Einsätze löschen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Alle Einsätze der Serie löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie <strong>alle wiederkehrenden Einsätze</strong> für <strong>{assignment.patientName}</strong> wirklich löschen?
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSeries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Alle löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Notes */}
          {assignment.employeeNote && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Hinweise
              </h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {assignment.employeeNote}
              </div>
            </div>
          )}

          {canEdit && assignment.internalNote && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Interne Notiz
              </h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                {assignment.internalNote}
              </div>
            </div>
          )}

          {/* Message to Dispatcher (for employees) */}
          {isEmployee && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Nachricht an Dispo</h4>
                <Textarea
                  placeholder="Rückfrage oder Hinweis..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                <Button size="sm" disabled={!message.trim()}>
                  Nachricht senden
                </Button>
              </div>
            </>
          )}

          {/* Status Dropdown (for dispatchers/admins) */}
          {canEdit && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Status manuell ändern</h4>
                <Select
                  value={assignment.status}
                  onValueChange={(value) => handleStatusChange(value as AssignmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['draft', 'planned', 'confirmed', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
