import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, Check, AlertTriangle, Loader2, ChevronRight, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ASSIGNMENT_TYPE_LABELS, AssignmentType, Assignment } from '@/types';
import { useDemoData, UserWithQualifications } from '@/hooks/use-demo-data';

interface ScheduleSuggestion {
  assignmentId: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  currentEmployeeId: string | null;
  currentEmployeeName: string | null;
  suggestedEmployeeId: string;
  suggestedEmployeeName: string;
  reason: string;
  score: number;
  priority: number;
}

interface SickReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  sickUntil: string | null;
  onApplySuggestions: (suggestions: ScheduleSuggestion[]) => Promise<void>;
  useDemo?: boolean;
  demoAssignments?: Assignment[];
  demoEmployees?: UserWithQualifications[];
}

export function SickReassignmentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  sickUntil,
  onApplySuggestions,
  useDemo = false,
  demoAssignments = [],
  demoEmployees = [],
}: SickReassignmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Use useDemoData as fallback for employees if not provided
  const { employees: hookEmployees, assignments: hookAssignments } = useDemoData();
  const effectiveEmployees = useDemo && demoEmployees.length > 0 ? demoEmployees : hookEmployees;
  const effectiveAssignments = useDemo && demoAssignments.length > 0 ? demoAssignments : hookAssignments;

  const today = new Date();
  const endDate = sickUntil ? new Date(sickUntil) : addDays(today, 14);

  // Generate demo suggestions locally without API call
  const generateDemoSuggestions = (): ScheduleSuggestion[] => {
    // Find assignments for the sick employee in the date range
    const affectedAssignments = effectiveAssignments.filter(a => {
      const assignmentDate = new Date(a.date);
      const isForSickEmployee = a.assignedEmployeeId === employeeId;
      const isInRange = (isSameDay(assignmentDate, today) || isAfter(assignmentDate, today)) &&
                        (isSameDay(assignmentDate, endDate) || isBefore(assignmentDate, endDate));
      const notCompleted = a.status !== 'completed' && a.status !== 'cancelled';
      return isForSickEmployee && isInRange && notCompleted;
    });

    if (affectedAssignments.length === 0) {
      return [];
    }

    // Get available employees (not sick and not the sick employee)
    const availableEmployees = effectiveEmployees.filter(e => 
      !e.isSick && e.id !== employeeId
    );

    if (availableEmployees.length === 0) {
      return [];
    }

    const suggestions: ScheduleSuggestion[] = [];

    for (const assignment of affectedAssignments) {
      // Find employees with matching qualifications
      const qualifiedEmployees = availableEmployees.filter(emp => {
        if (!emp.qualifications || emp.qualifications.length === 0) return true;
        return emp.qualifications.includes(assignment.type as any);
      });

      if (qualifiedEmployees.length === 0) continue;

      // Calculate workload for each employee on that day
      const employeeWorkloads = qualifiedEmployees.map(emp => {
        const dayAssignments = effectiveAssignments.filter(a => {
          const aDate = new Date(a.date);
          const assignmentDate = new Date(assignment.date);
          return a.assignedEmployeeId === emp.id && isSameDay(aDate, assignmentDate);
        });
        return {
          employee: emp,
          workload: dayAssignments.length,
        };
      });

      // Sort by workload (lowest first) for load balancing
      employeeWorkloads.sort((a, b) => a.workload - b.workload);

      const best = employeeWorkloads[0];
      if (!best) continue;

      const score = Math.max(60, 95 - best.workload * 10);

      suggestions.push({
        assignmentId: assignment.id,
        patientName: assignment.patientName,
        date: format(new Date(assignment.date), 'yyyy-MM-dd'),
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        type: assignment.type,
        currentEmployeeId: employeeId,
        currentEmployeeName: employeeName,
        suggestedEmployeeId: best.employee.id,
        suggestedEmployeeName: best.employee.name,
        reason: `${best.employee.name} hat ${best.workload} Einsätze an diesem Tag und ist verfügbar.`,
        score,
        priority: 1,
      });
    }

    return suggestions;
  };

  // Auto-generate suggestions when dialog opens
  useEffect(() => {
    if (open && employeeId) {
      handleGenerateSuggestions();
    }
  }, [open, employeeId]);

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedIds(new Set());

    try {
      // Demo mode: generate locally
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulate loading
        const demoSuggestions = generateDemoSuggestions();
        
        if (demoSuggestions.length > 0) {
          setSuggestions(demoSuggestions);
          // Pre-select all suggestions for sick replacement
          setSelectedIds(new Set(demoSuggestions.map((s) => s.assignmentId)));
        } else {
          setError('Keine Einsätze zur Neuzuweisung gefunden oder keine anderen Mitarbeiter verfügbar.');
        }
        return;
      }

      // Production mode: call edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode: 'sick_replacement',
            sickEmployeeId: employeeId,
            dateRange: {
              start: format(today, 'yyyy-MM-dd'),
              end: format(endDate, 'yyyy-MM-dd'),
            },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Zu viele Anfragen. Bitte warten Sie einen Moment.');
        }
        if (response.status === 402) {
          throw new Error('AI-Guthaben aufgebraucht.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler bei der AI-Analyse');
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        // Pre-select all suggestions for sick replacement
        setSelectedIds(new Set(data.suggestions.map((s: ScheduleSuggestion) => s.assignmentId)));
      } else {
        setError(data.message || 'Keine Einsätze zur Neuzuweisung gefunden.');
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    const selected = suggestions.filter(s => selectedIds.has(s.assignmentId));
    if (selected.length === 0) {
      toast.error('Keine Vorschläge ausgewählt');
      return;
    }

    setIsApplying(true);
    try {
      await onApplySuggestions(selected);
      toast.success(`${selected.length} Einsätze wurden neu zugeteilt`);
      onOpenChange(false);
      setSuggestions([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error applying suggestions:', err);
      toast.error('Fehler beim Anwenden der Vorschläge');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleSelection = (assignmentId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-destructive" />
            Einsätze neu zuweisen
            {useDemo && <Badge variant="outline" className="ml-2">Demo</Badge>}
          </DialogTitle>
          <DialogDescription>
            {employeeName} ist krank gemeldet{sickUntil && ` bis ${format(new Date(sickUntil), 'd. MMMM yyyy', { locale: de })}`}. 
            {useDemo ? ' Der Algorithmus schlägt' : ' Die AI schlägt'} Ersatz-Mitarbeiter für die offenen Einsätze vor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Suche Ersatz-Mitarbeiter...</p>
                <p className="text-sm text-muted-foreground">
                  Analysiere Verfügbarkeiten und Qualifikationen
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={handleGenerateSuggestions}>
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && !isLoading && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {suggestions.length} Einsätze • {selectedIds.size} ausgewählt
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedIds(
                    selectedIds.size === suggestions.length 
                      ? new Set() 
                      : new Set(suggestions.map(s => s.assignmentId))
                  )}
                >
                  {selectedIds.size === suggestions.length ? 'Keine' : 'Alle'} auswählen
                </Button>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {suggestions.map(suggestion => (
                    <div
                      key={suggestion.assignmentId}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        selectedIds.has(suggestion.assignmentId)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.has(suggestion.assignmentId)}
                        onCheckedChange={() => toggleSelection(suggestion.assignmentId)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{suggestion.patientName}</span>
                          <Badge variant="outline" className="text-xs">
                            {ASSIGNMENT_TYPE_LABELS[suggestion.type as AssignmentType] || suggestion.type}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(suggestion.date), 'EEEE, d. MMM', { locale: de })} • {suggestion.startTime} – {suggestion.endTime}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through">
                            {employeeName}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-primary">
                            {suggestion.suggestedEmployeeName}
                          </span>
                          <span className={cn("text-xs font-medium", getScoreColor(suggestion.score))}>
                            ({suggestion.score}%)
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleApply} 
                  disabled={selectedIds.size === 0 || isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {selectedIds.size} Einsätze neu zuweisen
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}