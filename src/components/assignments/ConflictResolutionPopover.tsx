import { useState } from 'react';
import { Sparkles, Loader2, User, Clock, Calendar, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type ConflictType = 'availability' | 'time_overlap' | 'qualification' | 'sick' | 'travel_time';

export interface ConflictContext {
  type: ConflictType;
  employeeId?: string;
  employeeName?: string;
  patientId?: string;
  patientName?: string;
  date: string;
  startTime: string;
  endTime: string;
  assignmentType?: string;
  conflictDetails?: string;
  availability?: {
    dayOfWeek: number;
    isAvailable: boolean;
    startTime: string;
    endTime: string;
    weekPattern: string;
  }[];
  overlappingAssignment?: {
    id: string;
    startTime: string;
    endTime: string;
    patientName?: string;
  };
}

interface Solution {
  title: string;
  description: string;
  actionType: 'change_employee' | 'change_time' | 'change_date' | 'split_assignment' | 'manual';
  suggestedEmployeeId?: string;
  suggestedEmployeeName?: string;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
  confidence: number;
}

interface ConflictResolutionPopoverProps {
  context: ConflictContext;
  onApplySolution?: (solution: Solution) => void;
  children: React.ReactNode;
}

export function ConflictResolutionPopover({
  context,
  onApplySolution,
  children,
}: ConflictResolutionPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [solutions, setSolutions] = useState<Solution[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && !solutions && !isLoading) {
      await fetchSolutions();
    }
  };

  const fetchSolutions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-conflict`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conflictType: context.type,
            context,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Anfrage');
      }

      const data = await response.json();
      setSolutions(data.solutions || []);
    } catch (err) {
      console.error('Conflict resolution error:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (solution: Solution) => {
    if (onApplySolution) {
      onApplySolution(solution);
      setIsOpen(false);
      toast.success('Vorschlag angewendet');
    }
  };

  const getActionIcon = (actionType: Solution['actionType']) => {
    switch (actionType) {
      case 'change_employee':
        return <User className="h-4 w-4" />;
      case 'change_time':
        return <Clock className="h-4 w-4" />;
      case 'change_date':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-600';
    if (confidence >= 40) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">KI-Lösungsvorschläge</span>
          </div>
        </div>

        <div className="p-3">
          {isLoading && (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analysiere Konflikt...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 py-4 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {solutions && solutions.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Keine Vorschläge verfügbar
            </div>
          )}

          {solutions && solutions.length > 0 && (
            <div className="space-y-2">
              {solutions.map((solution, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    onApplySolution 
                      ? "cursor-pointer hover:bg-muted/50" 
                      : "cursor-default"
                  )}
                  onClick={() => onApplySolution && handleApply(solution)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="mt-0.5 text-primary">
                        {getActionIcon(solution.actionType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{solution.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {solution.description}
                        </p>
                        {solution.suggestedEmployeeName && (
                          <p className="text-xs text-primary mt-1">
                            → {solution.suggestedEmployeeName}
                          </p>
                        )}
                        {solution.suggestedStartTime && (
                          <p className="text-xs text-primary mt-1">
                            → {solution.suggestedStartTime} - {solution.suggestedEndTime}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn("text-xs font-medium", getConfidenceColor(solution.confidence))}>
                        {solution.confidence}%
                      </span>
                      {onApplySolution && (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {solutions && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => {
                setSolutions(null);
                fetchSolutions();
              }}
            >
              Neu analysieren
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
