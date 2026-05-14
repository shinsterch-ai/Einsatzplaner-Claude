import { AssignmentType, ASSIGNMENT_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface TypeBadgeProps {
  type: AssignmentType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  const typeClasses: Record<AssignmentType, string> = {
    grundpflege: 'bg-[hsl(var(--type-grundpflege)/0.15)] text-[hsl(var(--type-grundpflege))]',
    behandlungspflege: 'bg-[hsl(var(--type-behandlungspflege)/0.15)] text-[hsl(var(--type-behandlungspflege))]',
    abklaerung: 'bg-[hsl(var(--type-abklaerung)/0.15)] text-[hsl(var(--type-abklaerung))]',
    haushalt: 'bg-[hsl(var(--type-haushalt)/0.15)] text-[hsl(var(--type-haushalt))]',
    privatleistungen: 'bg-[hsl(var(--type-privatleistungen)/0.15)] text-[hsl(var(--type-privatleistungen))]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        typeClasses[type],
        className
      )}
    >
      {ASSIGNMENT_TYPE_LABELS[type]}
    </span>
  );
}
