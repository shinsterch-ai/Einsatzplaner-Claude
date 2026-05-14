import { AssignmentStatus, STATUS_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: AssignmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusClasses: Record<AssignmentStatus, string> = {
    draft: 'status-draft',
    planned: 'status-planned',
    confirmed: 'status-confirmed',
    'in-progress': 'status-in-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  };

  return (
    <span className={cn('status-badge', statusClasses[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
