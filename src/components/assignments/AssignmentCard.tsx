import { Assignment, AssignmentType, AssignmentStatus } from '@/types';
import { StatusBadge } from './StatusBadge';
import { TypeBadge } from './TypeBadge';
import { cn } from '@/lib/utils';
import { Clock, MapPin, User, AlertTriangle, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Assignment type color classes using design system tokens
const TYPE_COLOR_CLASSES: Record<AssignmentType, { border: string; bg: string }> = {
  grundpflege: { 
    border: 'border-l-[hsl(var(--type-grundpflege))]', 
    bg: 'bg-[hsl(var(--type-grundpflege)/0.08)]' 
  },
  behandlungspflege: { 
    border: 'border-l-[hsl(var(--type-behandlungspflege))]', 
    bg: 'bg-[hsl(var(--type-behandlungspflege)/0.08)]' 
  },
  abklaerung: { 
    border: 'border-l-[hsl(var(--type-abklaerung))]', 
    bg: 'bg-[hsl(var(--type-abklaerung)/0.08)]' 
  },
  haushalt: { 
    border: 'border-l-[hsl(var(--type-haushalt))]', 
    bg: 'bg-[hsl(var(--type-haushalt)/0.08)]' 
  },
  privatleistungen: { 
    border: 'border-l-[hsl(var(--type-privatleistungen))]', 
    bg: 'bg-[hsl(var(--type-privatleistungen)/0.08)]' 
  },
};
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssignmentCardProps {
  assignment: Assignment;
  compact?: boolean;
  hasConflict?: boolean;
  onClick?: () => void;
  onQuickComplete?: (assignment: Assignment) => void;
  className?: string;
}

export function AssignmentCard({ 
  assignment, 
  compact = false, 
  hasConflict = false,
  onClick, 
  onQuickComplete,
  className 
}: AssignmentCardProps) {
  const isUrgent = assignment.priority === 'urgent';
  const isCompleted = assignment.status === 'completed';
  const isCancelled = assignment.status === 'cancelled';
  const canComplete = !isCompleted && !isCancelled;

  // Format duration for display
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const durationDisplay = formatDuration(assignment.durationMinutes);

  const typeColors = TYPE_COLOR_CLASSES[assignment.type];

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'calendar-slot border-l-4 relative',
          hasConflict 
            ? 'border-l-destructive bg-destructive/10' 
            : isUrgent 
              ? `${typeColors.border} ${typeColors.bg} ring-1 ring-accent/30`
              : `${typeColors.border} ${typeColors.bg}`,
          hasConflict ? 'hover:bg-destructive/15' : 'hover:bg-primary/10',
          className
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-xs">
              {assignment.startTime}
            </span>
            {durationDisplay && (
              <span className="text-xs text-muted-foreground bg-muted px-1 rounded">
                {durationDisplay}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasConflict && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-3 w-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Terminkonflikt - Überlappung mit anderem Einsatz</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isUrgent && (
              <AlertTriangle className="h-3 w-3 text-accent" />
            )}
          </div>
        </div>
        <p className={cn(
          "font-semibold text-sm truncate",
          hasConflict && "text-destructive"
        )}>{assignment.patientName}</p>
        <p className="text-xs text-muted-foreground truncate">{assignment.zone}</p>
      </div>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 card-interactive cursor-pointer border-l-4',
        hasConflict 
          ? 'border-l-destructive ring-1 ring-destructive/30' 
          : `${typeColors.border}`,
        isCompleted && 'opacity-60',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeBadge type={assignment.type} />
          {hasConflict && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertCircle className="h-3 w-3" />
              Konflikt
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
              <AlertTriangle className="h-3 w-3" />
              Dringend
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onQuickComplete && canComplete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickComplete(assignment);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Einsatz abschliessen</p>
              </TooltipContent>
            </Tooltip>
          )}
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      <h3 className={cn(
        "font-semibold text-lg mb-2",
        hasConflict && "text-destructive"
      )}>{assignment.patientName}</h3>

      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{assignment.startTime} - {assignment.endTime}</span>
          {durationDisplay && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
              {durationDisplay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{assignment.zone}</span>
        </div>
        {assignment.assignedEmployeeName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{assignment.assignedEmployeeName}</span>
          </div>
        )}
      </div>

      {assignment.employeeNote && (
        <div className="mt-3 flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span className="text-muted-foreground">{assignment.employeeNote}</span>
        </div>
      )}
    </Card>
  );
}
