import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Clock, CheckCircle, AlertCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MoveAction } from '@/hooks/use-undo-stack';

interface PlanSaveBarProps {
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  autoSaveIntervalMs?: number; // Default 10 minutes
  className?: string;
  canUndo?: boolean;
  lastAction?: MoveAction;
  onUndo?: () => void;
  undoCount?: number;
  hasActiveConflicts?: boolean;
  conflictCount?: number;
}

export function PlanSaveBar({
  hasUnsavedChanges,
  onSave,
  autoSaveIntervalMs = 10 * 60 * 1000, // 10 minutes
  className,
  canUndo = false,
  lastAction,
  onUndo,
  undoCount = 0,
  hasActiveConflicts = false,
  conflictCount = 0,
}: PlanSaveBarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [timeUntilAutoSave, setTimeUntilAutoSave] = useState(autoSaveIntervalMs);
  const lastActivityRef = useRef<number>(Date.now());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async () => {
    if (isSaving || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      await onSave();
      setSaveSuccess(true);
      setTimeUntilAutoSave(autoSaveIntervalMs);
      lastActivityRef.current = Date.now();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(true);
      console.error('Error saving plan:', error);
      setTimeout(() => setSaveError(false), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, isSaving, onSave, autoSaveIntervalMs]);

  // Track activity and reset auto-save timer
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setTimeUntilAutoSave(autoSaveIntervalMs);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, autoSaveIntervalMs - elapsed);
      setTimeUntilAutoSave(remaining);

      if (remaining === 0 && hasUnsavedChanges) {
        handleSave();
      }
    };

    // Update timer every second
    autoSaveTimerRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSaveIntervalMs, handleSave]);

  // Reset activity timer when there are changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      lastActivityRef.current = Date.now();
      setTimeUntilAutoSave(autoSaveIntervalMs);
    }
  }, [hasUnsavedChanges, autoSaveIntervalMs]);

  // Show bar if there are unsaved changes, undo available, conflicts, or status messages
  if (!hasUnsavedChanges && !saveSuccess && !saveError && !canUndo && !hasActiveConflicts) {
    return null;
  }

  const progressValue = ((autoSaveIntervalMs - timeUntilAutoSave) / autoSaveIntervalMs) * 100;
  const minutesLeft = Math.ceil(timeUntilAutoSave / 60000);

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'bg-card border-2 rounded-xl shadow-lg px-4 py-3',
        'flex items-center gap-4 min-w-[400px] max-w-[700px]',
        hasActiveConflicts && 'border-destructive bg-destructive/5',
        !hasActiveConflicts && hasUnsavedChanges && 'border-amber-500 bg-amber-500/5',
        saveSuccess && 'border-green-500 bg-green-500/5',
        saveError && 'border-destructive bg-destructive/5',
        className
      )}
    >
      {(hasUnsavedChanges || canUndo || hasActiveConflicts) && !saveSuccess && !saveError && (
        <>
          {/* Conflict Warning */}
          {hasActiveConflicts && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {conflictCount} Terminkonflikt{conflictCount > 1 ? 'e' : ''} vorhanden
                </p>
                <p className="text-xs text-destructive/80">
                  Speichern nicht möglich – bitte beheben Sie die Konflikte
                </p>
              </div>
            </div>
          )}

          {/* Undo Button */}
          {canUndo && onUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              title={lastAction ? `Rückgängig: ${lastAction.newEmployeeName} → ${lastAction.previousEmployeeName || 'Nicht zugewiesen'}` : 'Letzte Aktion rückgängig machen'}
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Rückgängig</span>
              {undoCount > 1 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {undoCount}
                </span>
              )}
            </Button>
          )}

          {hasUnsavedChanges && !hasActiveConflicts && (
            <>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <Clock className="h-4 w-4" />
                  <span>Ungespeicherte Änderungen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progressValue} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Auto-Save in {minutesLeft} Min
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mitarbeiter sehen die Änderungen erst nach dem Speichern
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Plan speichern
                  </>
                )}
              </Button>
            </>
          )}
        </>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Plan erfolgreich gespeichert!</span>
          <span className="text-sm text-muted-foreground">
            Mitarbeiter sehen jetzt die aktuellen Einsätze.
          </span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Fehler beim Speichern</span>
          <Button variant="outline" size="sm" onClick={handleSave}>
            Erneut versuchen
          </Button>
        </div>
      )}
    </div>
  );
}
