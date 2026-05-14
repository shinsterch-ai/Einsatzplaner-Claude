import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  employeeId: string;
  employeeName: string;
  date: Date;
  isActive: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent, employeeId: string, employeeName: string, date: Date) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, employeeId: string, employeeName: string, date: Date) => void;
  children: ReactNode;
  className?: string;
}

export function DropZone({
  employeeId,
  employeeName,
  date,
  isActive,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  className,
}: DropZoneProps) {
  return (
    <div
      className={cn(
        'min-h-[100px] transition-colors rounded-lg p-1',
        isDragging && 'bg-muted/30',
        isActive && 'bg-primary/10 ring-2 ring-primary ring-inset',
        className
      )}
      onDragOver={(e) => onDragOver(e, employeeId, employeeName, date)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, employeeId, employeeName, date)}
    >
      {children}
      {isActive && (
        <div className="border-2 border-dashed border-primary rounded p-2 text-center text-xs text-primary mt-1">
          Hier ablegen
        </div>
      )}
    </div>
  );
}
