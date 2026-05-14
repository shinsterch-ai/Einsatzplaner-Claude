import { Assignment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, User, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface UnassignedAssignmentsSidebarProps {
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
}

const typeLabels: Record<string, string> = {
  grundpflege: 'Grundpflege',
  behandlungspflege: 'Behandlungspflege',
  abklaerung: 'Abklärung',
  haushalt: 'Haushalt',
  privatleistungen: 'Privatleistungen',
};

export function UnassignedAssignmentsSidebar({
  assignments,
  onAssignmentClick,
}: UnassignedAssignmentsSidebarProps) {
  // Filter to only unassigned assignments
  const unassignedAssignments = assignments.filter(
    (a) => !a.assignedEmployeeId && a.status !== 'cancelled'
  );

  if (unassignedAssignments.length === 0) {
    return null;
  }

  // Group by date
  const groupedByDate = unassignedAssignments.reduce((acc, assignment) => {
    const dateKey = format(assignment.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <Card className="w-80 shrink-0 border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Nicht zugewiesen
          <Badge variant="destructive" className="ml-auto">
            {unassignedAssignments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4 p-4 pt-0">
            {sortedDates.map((dateKey) => {
              const dateAssignments = groupedByDate[dateKey];
              const date = new Date(dateKey);
              
              return (
                <div key={dateKey} className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(date, 'EEEE, dd.MM.', { locale: de })}
                  </div>
                  {dateAssignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      onClick={() => onAssignmentClick?.(assignment)}
                      className="w-full text-left p-3 rounded-lg border border-destructive/20 bg-background hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {assignment.patientName || 'Klient'}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {typeLabels[assignment.type] || assignment.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assignment.startTime?.substring(0, 5) || assignment.preferredStartTime?.substring(0, 5) || '?'} - 
                          {assignment.endTime?.substring(0, 5) || assignment.preferredEndTime?.substring(0, 5) || '?'}
                        </span>
                        {assignment.zone && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {assignment.zone}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {assignment.responsiblePersonName 
                            ? `Fallführend: ${assignment.responsiblePersonName}` 
                            : 'Keine Fallführung'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
