import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, Check, X, AlertTriangle, Loader2, ChevronRight, Users } from 'lucide-react';
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
import { useDemoData } from '@/hooks/use-demo-data';

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

interface AIScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeekStart: Date;
  onApplySuggestions: (suggestions: ScheduleSuggestion[]) => Promise<void>;
  useDemo?: boolean;
  demoAssignments?: Assignment[];
}

export function AIScheduleDialog({
  open,
  onOpenChange,
  currentWeekStart,
  onApplySuggestions,
  useDemo = false,
  demoAssignments = [],
}: AIScheduleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { employees } = useDemoData();
  
  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  // Generate demo suggestions locally without API call
  const generateDemoSuggestions = (): ScheduleSuggestion[] => {
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(addDays(weekStart, i));
    }

    // Find assignments that are unassigned or in draft/planned status
    const eligibleAssignments = demoAssignments.filter(a => {
      const assignmentDate = new Date(a.date);
      const isInWeek = weekDays.some(day => isSameDay(day, assignmentDate));
      const needsAssignment = !a.assignedEmployeeId || a.status === 'draft' || a.status === 'planned';
      return isInWeek && needsAssignment;
    });

    if (eligibleAssignments.length === 0) {
      return [];
    }

    // Get available employees (not sick)
    const availableEmployees = employees.filter(e => !e.isSick);
    
    if (availableEmployees.length === 0) {
      return [];
    }

    // Generate suggestions
    const suggestions: ScheduleSuggestion[] = [];
    
    for (const assignment of eligibleAssignments) {
      // Find employees with matching qualifications
      const qualifiedEmployees = availableEmployees.filter(emp => {
        if (!emp.qualifications || emp.qualifications.length === 0) return true;
        return emp.qualifications.includes(assignment.type as any);
      });

      if (qualifiedEmployees.length === 0) continue;

      // Calculate workload for each employee on that day
      const employeeWorkloads = qualifiedEmployees.map(emp => {
        const dayAssignments = demoAssignments.filter(a => {
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

      // Don't suggest if already assigned to this employee
      if (assignment.assignedEmployeeId === best.employee.id) continue;

      const score = Math.max(60, 95 - best.workload * 10);
      const priority = !assignment.assignedEmployeeId ? 1 : assignment.status === 'draft' ? 2 : 3;

      let reason = '';
      if (!assignment.assignedEmployeeId) {
        reason = `Noch nicht zugewiesen. ${best.employee.name} hat ${best.workload} Einsätze an diesem Tag.`;
      } else {
        reason = `Optimierung: ${best.employee.name} hat weniger Auslastung (${best.workload} Einsätze).`;
      }

      suggestions.push({
        assignmentId: assignment.id,
        patientName: assignment.patientName,
        date: format(new Date(assignment.date), 'yyyy-MM-dd'),
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        type: assignment.type,
        currentEmployeeId: assignment.assignedEmployeeId || null,
        currentEmployeeName: assignment.assignedEmployeeName || null,
        suggestedEmployeeId: best.employee.id,
        suggestedEmployeeName: best.employee.name,
        reason,
        score,
        priority,
      });
    }

    // Sort by priority
    suggestions.sort((a, b) => a.priority - b.priority);

    return suggestions;
  };

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedIds(new Set());

    try {
      // Demo mode: generate locally
      if (useDemo) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
        const demoSuggestions = generateDemoSuggestions();
        
        if (demoSuggestions.length > 0) {
          setSuggestions(demoSuggestions);
          // Pre-select high priority suggestions
          const highPriority = demoSuggestions
            .filter((s) => s.priority === 1)
            .map((s) => s.assignmentId);
          setSelectedIds(new Set(highPriority));
        } else {
          setError('Keine offenen Einsätze für diese Woche. Alle Einsätze sind bereits optimal zugeteilt.');
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
            mode: 'week',
            weekStart: format(weekStart, 'yyyy-MM-dd'),
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
        // Pre-select high priority suggestions
        const highPriority = data.suggestions
          .filter((s: ScheduleSuggestion) => s.priority === 1)
          .map((s: ScheduleSuggestion) => s.assignmentId);
        setSelectedIds(new Set(highPriority));
      } else {
        setError(data.message || 'Keine Vorschläge verfügbar. Alle Einsätze sind bereits optimal zugeteilt.');
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
      toast.success(`${selected.length} Einsätze wurden zugeteilt`);
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

  const selectAll = () => {
    setSelectedIds(new Set(suggestions.map(s => s.assignmentId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive" className="text-xs">Hoch</Badge>;
      case 2:
        return <Badge variant="secondary" className="text-xs">Mittel</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Niedrig</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Planvorschlag
            {useDemo && <Badge variant="outline" className="ml-2">Demo</Badge>}
          </DialogTitle>
          <DialogDescription>
            Automatische Einsatzplanung für KW {format(weekStart, 'w')} ({format(weekStart, 'd. MMM', { locale: de })} – {format(weekEnd, 'd. MMM yyyy', { locale: de })})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Initial State */}
          {suggestions.length === 0 && !isLoading && !error && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Intelligente Einsatzplanung</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {useDemo 
                    ? 'Der Algorithmus analysiert die Demo-Daten und schlägt optimale Zuordnungen vor.'
                    : 'Die AI analysiert Verfügbarkeiten, Qualifikationen und aktuelle Auslastung um optimale Mitarbeiterzuordnungen vorzuschlagen.'}
                </p>
              </div>
              <Button onClick={handleGenerateSuggestions} size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Planvorschlag generieren
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <div className="space-y-1">
                <p className="font-medium">{useDemo ? 'Analysiere Einsätze...' : 'AI analysiert Einsätze...'}</p>
                <p className="text-sm text-muted-foreground">
                  Prüfe Verfügbarkeiten, Qualifikationen und Auslastung
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
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
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {suggestions.length} Vorschläge • {selectedIds.size} ausgewählt
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Alle auswählen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Keine
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
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
                          {getPriorityBadge(suggestion.priority)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(suggestion.date), 'EEEE, d. MMM', { locale: de })} • {suggestion.startTime} – {suggestion.endTime}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          {suggestion.currentEmployeeName ? (
                            <>
                              <span className="text-muted-foreground line-through">
                                {suggestion.currentEmployeeName}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Nicht zugewiesen</span>
                          )}
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

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setSuggestions([])}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Neue Analyse
                </Button>
                <div className="flex gap-2">
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
                    {selectedIds.size} Vorschläge übernehmen
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}