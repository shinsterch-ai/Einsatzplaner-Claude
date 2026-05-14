import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Assignment } from '@/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Calendar, 
  User, 
  Trash2, 
  ChevronRight,
  Repeat,
  Users,
  MapPin
} from 'lucide-react';
import { TypeBadge } from './TypeBadge';

interface SeriesGroup {
  seriesId: string;
  assignments: Assignment[];
  patientName: string;
  type: Assignment['type'];
  zone: string | null;
  recurrence: Assignment['recurrence'];
  startDate: string;
  endDate: string;
  assignedEmployees: { id: string; name: string }[];
  count: number;
}

interface RecurringSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignments: Assignment[];
  onDeleteSeries: (seriesId: string) => void;
  onViewAssignment: (assignment: Assignment) => void;
}

export function RecurringSeriesDialog({
  open,
  onOpenChange,
  assignments,
  onDeleteSeries,
  onViewAssignment,
}: RecurringSeriesDialogProps) {
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);

  // Group assignments by series_id
  const seriesGroups = useMemo(() => {
    const groups: Map<string, SeriesGroup> = new Map();

    const getDateString = (date: Date | string): string => {
      if (typeof date === 'string') return date;
      return format(date, 'yyyy-MM-dd');
    };

    assignments.forEach((assignment) => {
      if (!assignment.seriesId) return;

      const dateStr = getDateString(assignment.date);
      const existing = groups.get(assignment.seriesId);
      
      if (existing) {
        existing.assignments.push(assignment);
        existing.count++;
        
        // Update date range
        if (dateStr < existing.startDate) {
          existing.startDate = dateStr;
        }
        if (dateStr > existing.endDate) {
          existing.endDate = dateStr;
        }
        
        // Track unique employees
        if (assignment.assignedEmployeeId && assignment.assignedEmployeeName) {
          const alreadyExists = existing.assignedEmployees.some(
            e => e.id === assignment.assignedEmployeeId
          );
          if (!alreadyExists) {
            existing.assignedEmployees.push({
              id: assignment.assignedEmployeeId,
              name: assignment.assignedEmployeeName,
            });
          }
        }
      } else {
        groups.set(assignment.seriesId, {
          seriesId: assignment.seriesId,
          assignments: [assignment],
          patientName: assignment.patientName,
          type: assignment.type,
          zone: assignment.zone,
          recurrence: assignment.recurrence,
          startDate: dateStr,
          endDate: dateStr,
          assignedEmployees: assignment.assignedEmployeeId && assignment.assignedEmployeeName
            ? [{ id: assignment.assignedEmployeeId, name: assignment.assignedEmployeeName }]
            : [],
          count: 1,
        });
      }
    });

    // Sort assignments within each group by date
    groups.forEach((group) => {
      group.assignments.sort((a, b) => {
        const dateA = getDateString(a.date);
        const dateB = getDateString(b.date);
        return dateA.localeCompare(dateB);
      });
    });

    return Array.from(groups.values()).sort((a, b) => 
      a.startDate.localeCompare(b.startDate)
    );
  }, [assignments]);

  const handleDeleteSeries = () => {
    if (deleteSeriesId) {
      onDeleteSeries(deleteSeriesId);
      setDeleteSeriesId(null);
      setExpandedSeries(null);
    }
  };

  const getRecurrenceLabel = (recurrence: Assignment['recurrence']) => {
    switch (recurrence) {
      case 'daily':
        return 'Täglich';
      case 'weekly':
        return 'Wöchentlich';
      default:
        return 'Einmalig';
    }
  };

  const toggleExpanded = (seriesId: string) => {
    setExpandedSeries(prev => prev === seriesId ? null : seriesId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Wiederkehrende Serien
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {seriesGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Repeat className="h-12 w-12 mb-4 opacity-50" />
                <p>Keine wiederkehrenden Serien vorhanden</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seriesGroups.map((series) => (
                  <div
                    key={series.seriesId}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Series Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleExpanded(series.seriesId)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ChevronRight 
                          className={`h-4 w-4 transition-transform flex-shrink-0 ${
                            expandedSeries === series.seriesId ? 'rotate-90' : ''
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{series.patientName}</span>
                            <TypeBadge type={series.type} />
                            <Badge variant="outline" className="text-xs">
                              {series.count} Termine
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(parseISO(series.startDate), 'd. MMM', { locale: de })} - {format(parseISO(series.endDate), 'd. MMM yyyy', { locale: de })}
                            </span>
                            {series.zone && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {series.zone}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {getRecurrenceLabel(series.recurrence)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSeriesId(series.seriesId);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded: Show all assignments */}
                    {expandedSeries === series.seriesId && (
                      <div className="border-t bg-muted/30">
                        <div className="p-3">
                          {/* Employees summary */}
                          {series.assignedEmployees.length > 0 && (
                            <div className="flex items-center gap-2 mb-3 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Zugewiesen an:</span>
                              <div className="flex flex-wrap gap-1">
                                {series.assignedEmployees.map((emp) => (
                                  <Badge key={emp.id} variant="outline" className="text-xs">
                                    {emp.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Separator className="my-2" />
                          
                          {/* Individual assignments */}
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {series.assignments.map((assignment) => {
                              const dateStr = typeof assignment.date === 'string' 
                                ? assignment.date 
                                : format(assignment.date, 'yyyy-MM-dd');
                              return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between p-2 rounded hover:bg-background cursor-pointer transition-colors"
                                onClick={() => {
                                  onViewAssignment(assignment);
                                  onOpenChange(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium w-24">
                                    {format(parseISO(dateStr), 'EEE, d. MMM', { locale: de })}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {assignment.startTime} - {assignment.endTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {assignment.assignedEmployeeName ? (
                                    <span className="text-sm flex items-center gap-1">
                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                      {assignment.assignedEmployeeName}
                                    </span>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                      Nicht zugewiesen
                                    </Badge>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            );})}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSeriesId} onOpenChange={() => setDeleteSeriesId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Serie löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich alle Termine dieser Serie löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Alle löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
