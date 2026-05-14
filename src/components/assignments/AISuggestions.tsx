import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Sparkles, User, Clock, MapPin, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { TimeInput } from '@/components/ui/time-input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ASSIGNMENT_TYPE_LABELS, AssignmentType } from '@/types';
import { DbPatient } from '@/hooks/use-patients';
import { CreateAssignmentData } from '@/hooks/use-assignments';
import { toast } from 'sonner';

interface AISuggestion {
  priority: number;
  employeeId: string;
  employeeName: string;
  reason: string;
  score: number;
}

interface AIResponse {
  patient: {
    id: string;
    code: string;
    city: string | null;
  };
  requestedSlot: {
    date: string;
    startTime: string;
    endTime: string;
    type: string;
  };
  suggestions: AISuggestion[];
}

interface AISuggestionsProps {
  patient: DbPatient;
  onCreateAssignment: (data: CreateAssignmentData) => Promise<void>;
  onClose: () => void;
}

export function AISuggestions({ patient, onCreateAssignment, onClose }: AISuggestionsProps) {
  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [type, setType] = useState<AssignmentType>('grundpflege');
  
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [requestedSlot, setRequestedSlot] = useState<AIResponse['requestedSlot'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/suggest-assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            patientId: patient.id,
            date: format(date, 'yyyy-MM-dd'),
            startTime,
            endTime,
            type,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Anfrage');
      }

      const data: AIResponse = await response.json();
      setSuggestions(data.suggestions);
      setRequestedSlot(data.requestedSlot);
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      toast.error('Fehler bei KI-Analyse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    if (!requestedSlot) return;

    setCreatingFor(suggestion.employeeId);
    try {
      // Calculate duration from start/end times
      const startParts = requestedSlot.startTime.split(':').map(Number);
      const endParts = requestedSlot.endTime.split(':').map(Number);
      const durationMinutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
      
      await onCreateAssignment({
        patient_id: patient.id,
        assigned_employee_id: suggestion.employeeId,
        date: requestedSlot.date,
        preferred_start_time: requestedSlot.startTime,
        preferred_end_time: requestedSlot.endTime,
        duration_minutes: durationMinutes,
        start_time: requestedSlot.startTime,
        end_time: requestedSlot.endTime,
        type: requestedSlot.type as any,
        zone: patient.city || undefined,
        status: 'planned',
        priority: 'normal',
      });

      toast.success(`Einsatz für ${suggestion.employeeName} erstellt`);
      onClose();
    } catch (err) {
      toast.error('Fehler beim Erstellen des Einsatzes');
    } finally {
      setCreatingFor(null);
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'border-green-500 bg-green-50 dark:bg-green-950/30';
      case 2: return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
      case 3: return 'border-amber-500 bg-amber-50 dark:bg-amber-950/30';
      default: return 'border-muted';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Beste Wahl';
      case 2: return 'Gute Alternative';
      case 3: return 'Möglich';
      default: return '';
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          KI-Einsatzvorschläge
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Klient: <strong>{patient.full_name}</strong>
          {patient.city && ` · ${patient.city}`}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Form */}
        {!suggestions && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-9',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      {format(date, 'EEE, dd.MM.', { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      disabled={(d) => d < new Date()}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Einsatzart</Label>
                <Select value={type} onValueChange={(v) => setType(v as AssignmentType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Von</Label>
                <TimeInput
                  value={startTime}
                  onChange={setStartTime}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Bis</Label>
                <TimeInput
                  value={endTime}
                  onChange={setEndTime}
                  className="h-9"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleGetSuggestions}
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysiere...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Vorschläge generieren
                </>
              )}
            </Button>
          </div>
        )}

        {/* Suggestions List */}
        {suggestions && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {requestedSlot && (
                <span>
                  {format(new Date(requestedSlot.date), 'EEEE, dd. MMMM', { locale: de })} · {requestedSlot.startTime} - {requestedSlot.endTime}
                </span>
              )}
            </div>

            {suggestions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keine verfügbaren Mitarbeiter gefunden</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.employeeId}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-colors',
                      getPriorityColor(suggestion.priority)
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-background/80">
                            #{suggestion.priority} {getPriorityLabel(suggestion.priority)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Score: {suggestion.score}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{suggestion.employeeName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        disabled={creatingFor !== null}
                        className="shrink-0"
                      >
                        {creatingFor === suggestion.employeeId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSuggestions(null);
                  setRequestedSlot(null);
                }}
                className="flex-1"
              >
                Neue Analyse
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Schliessen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
