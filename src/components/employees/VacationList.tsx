import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { 
  Palmtree, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EmployeeVacation,
  VacationType,
  VACATION_TYPE_LABELS,
  VACATION_STATUS_LABELS,
} from "@/hooks/use-employee-vacations";
import { VacationDialog } from "./VacationDialog";
import { cn } from "@/lib/utils";

interface VacationListProps {
  employeeId: string;
  employeeName: string;
  vacations: EmployeeVacation[];
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  onCreateVacation: (data: {
    startDate: string;
    endDate: string;
    vacationType: VacationType;
    daysCount: number;
    note?: string;
  }) => Promise<void>;
  onUpdateVacation: (id: string, data: {
    startDate: string;
    endDate: string;
    vacationType: VacationType;
    daysCount: number;
    note?: string;
  }) => Promise<void>;
  onDeleteVacation: (id: string) => Promise<void>;
  onUpdateVacationDaysTotal: (days: number) => Promise<void>;
  isAdmin?: boolean;
}

const VACATION_TYPE_COLORS: Record<VacationType, string> = {
  vacation: 'bg-green-100 text-green-800 border-green-200',
  unpaid_leave: 'bg-amber-100 text-amber-800 border-amber-200',
  special_leave: 'bg-blue-100 text-blue-800 border-blue-200',
  training: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function VacationList({
  employeeId,
  employeeName,
  vacations,
  vacationDaysTotal,
  vacationDaysUsed,
  onCreateVacation,
  onUpdateVacation,
  onDeleteVacation,
  onUpdateVacationDaysTotal,
  isAdmin = false,
}: VacationListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<EmployeeVacation | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState(vacationDaysTotal);

  const remainingDays = vacationDaysTotal - vacationDaysUsed;
  const approvedVacations = vacations.filter(v => v.status === 'approved');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Current and upcoming: end date is today or later
  const upcomingVacations = approvedVacations.filter(v => parseISO(v.endDate) >= today);
  // Past: end date is before today
  const pastVacations = approvedVacations.filter(v => parseISO(v.endDate) < today);

  const handleEdit = (vacation: EmployeeVacation) => {
    setEditingVacation(vacation);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingVacation(undefined);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    startDate: string;
    endDate: string;
    vacationType: VacationType;
    daysCount: number;
    note?: string;
  }) => {
    if (editingVacation) {
      await onUpdateVacation(editingVacation.id, data);
    } else {
      await onCreateVacation(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await onDeleteVacation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveTotal = async () => {
    await onUpdateVacationDaysTotal(tempTotal);
    setEditingTotal(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-primary" />
            Ferien & Abwesenheiten
          </CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Eintragen
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vacation Balance */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Feriensaldo</p>
              <p className="text-xs text-muted-foreground">
                Jahresanspruch
              </p>
            </div>
          </div>
          
          <div className="text-right">
            {editingTotal && isAdmin ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={tempTotal}
                  onChange={(e) => setTempTotal(parseInt(e.target.value) || 0)}
                  className="w-16 h-8 text-center border rounded text-sm"
                />
                <Button size="sm" variant="ghost" onClick={handleSaveTotal}>
                  ✓
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTotal(false)}>
                  ✕
                </Button>
              </div>
            ) : (
              <div 
                className={cn(
                  "cursor-pointer",
                  isAdmin && "hover:bg-muted rounded px-2 py-1 transition-colors"
                )}
                onClick={() => isAdmin && setEditingTotal(true)}
              >
                <p className={cn(
                  "text-lg font-bold",
                  remainingDays < 0 ? "text-destructive" :
                  remainingDays <= 5 ? "text-amber-600" : "text-green-600"
                )}>
                  {remainingDays} / {vacationDaysTotal}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vacationDaysUsed} bezogen
                </p>
              </div>
            )}
          </div>
        </div>

        {remainingDays < 0 && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
            <AlertCircle className="h-4 w-4" />
            Ferienkontingent überschritten!
          </div>
        )}

        {/* Upcoming Vacations */}
        {upcomingVacations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Geplant</p>
            {upcomingVacations.map((vacation) => (
              <VacationItem
                key={vacation.id}
                vacation={vacation}
                onEdit={() => handleEdit(vacation)}
                onDelete={() => setDeleteConfirmId(vacation.id)}
                canEdit={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Past Vacations */}
        {pastVacations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Vergangen</p>
            {pastVacations.slice(0, 3).map((vacation) => (
              <VacationItem
                key={vacation.id}
                vacation={vacation}
                onEdit={() => handleEdit(vacation)}
                onDelete={() => setDeleteConfirmId(vacation.id)}
                canEdit={isAdmin}
                isPast
              />
            ))}
            {pastVacations.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{pastVacations.length - 3} weitere
              </p>
            )}
          </div>
        )}

        {vacations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Ferien eingetragen
          </p>
        )}
      </CardContent>

      <VacationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        vacation={editingVacation}
        onSave={handleSave}
        remainingVacationDays={remainingDays}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ferien löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface VacationItemProps {
  vacation: EmployeeVacation;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isPast?: boolean;
}

function VacationItem({ vacation, onEdit, onDelete, canEdit, isPast }: VacationItemProps) {
  const startDate = parseISO(vacation.startDate);
  const endDate = parseISO(vacation.endDate);
  const isSameDay = vacation.startDate === vacation.endDate;

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg border",
      isPast && "opacity-60"
    )}>
      <div className="flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={VACATION_TYPE_COLORS[vacation.vacationType]}
        >
          {VACATION_TYPE_LABELS[vacation.vacationType]}
        </Badge>
        <div>
          <p className="text-sm font-medium">
            {isSameDay 
              ? format(startDate, "dd.MM.yyyy", { locale: de })
              : `${format(startDate, "dd.MM.", { locale: de })} – ${format(endDate, "dd.MM.yyyy", { locale: de })}`
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {vacation.daysCount} {vacation.daysCount === 1 ? 'Tag' : 'Tage'}
            {vacation.note && ` · ${vacation.note}`}
          </p>
        </div>
      </div>
      
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
