import { Assignment } from '@/types';
import { AssignmentCard } from './AssignmentCard';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableAssignmentCardProps {
  assignment: Assignment;
  onDragStart: (e: React.DragEvent, assignment: Assignment) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick?: () => void;
  onQuickComplete?: (assignment: Assignment) => void;
  isDragging?: boolean;
  hasConflict?: boolean;
  compact?: boolean;
  className?: string;
  employeeColor?: string;
}

export function DraggableAssignmentCard({
  assignment,
  onDragStart,
  onDragEnd,
  onClick,
  onQuickComplete,
  isDragging,
  hasConflict = false,
  compact = true,
  className,
  employeeColor,
}: DraggableAssignmentCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      onDragEnd={onDragEnd}
      className={cn(
        'relative group cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-50',
        hasConflict && 'ring-2 ring-destructive ring-offset-1 rounded-md animate-pulse',
        className
      )}
    >
      {/* Drag handle indicator */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Employee color indicator */}
      {employeeColor && (
        <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l', employeeColor)} />
      )}
      
      <AssignmentCard
        assignment={assignment}
        onClick={onClick}
        onQuickComplete={onQuickComplete}
        compact={compact}
        hasConflict={hasConflict}
      />
    </div>
  );
}
