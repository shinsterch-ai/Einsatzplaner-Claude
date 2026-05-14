import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useWorktimeSettings, useSaveWorktimeSettings } from "@/hooks/use-worktime-settings";
import { useAuth } from "@/contexts/AuthContext";

export function WorktimeSettings() {
  const { isOrgAdmin, isSuperadmin } = useAuth();
  const canManage = isOrgAdmin || isSuperadmin;
  
  const { data: settings, isLoading } = useWorktimeSettings();
  const saveSettings = useSaveWorktimeSettings();

  const [formData, setFormData] = useState({
    weekly_hours_base: 40,
    max_daily_hours: 10,
    min_break_after_hours: 6,
    min_break_duration_minutes: 30,
    block_conflicts: true,
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        weekly_hours_base: settings.weekly_hours_base ?? 40,
        max_daily_hours: settings.max_daily_hours ?? 10,
        min_break_after_hours: settings.min_break_after_hours ?? 6,
        min_break_duration_minutes: settings.min_break_duration_minutes ?? 30,
        block_conflicts: settings.block_conflicts ?? true,
      });
    }
  }, [settings]);

  // Plausibility checks
  const validationIssues = useMemo(() => {
    const issues: { type: 'error' | 'warning'; message: string }[] = [];
    const hours = formData.weekly_hours_base;
    
    if (hours < 20) {
      issues.push({ type: 'warning', message: 'Wöchentliche Arbeitszeit unter 20 Stunden ist ungewöhnlich niedrig – bitte prüfen.' });
    } else if (hours < 35) {
      issues.push({ type: 'warning', message: 'Wöchentliche Arbeitszeit unter 35 Stunden – bitte prüfen.' });
    }
    
    if (hours > 50) {
      issues.push({ type: 'warning', message: 'Wöchentliche Arbeitszeit über 50 Stunden ist arbeitsrechtlich bedenklich – bitte prüfen.' });
    } else if (hours > 45) {
      issues.push({ type: 'warning', message: 'Wöchentliche Arbeitszeit über 45 Stunden ist überdurchschnittlich hoch.' });
    }
    
    if (formData.max_daily_hours > 12) {
      issues.push({ type: 'warning', message: 'Maximale Tagesstunden über 12h können gesundheitlich problematisch sein.' });
    }
    
    if (formData.min_break_duration_minutes < 20) {
      issues.push({ type: 'warning', message: 'Mindestpausendauer unter 20 Minuten ist gemäss ArG nicht zulässig.' });
    }
    
    return issues;
  }, [formData]);

  const hasErrors = validationIssues.some(i => i.type === 'error');

  const handleSave = async () => {
    if (hasErrors) return;
    await saveSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Arbeitszeitregeln</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arbeitszeitregeln</CardTitle>
        <CardDescription>
          Konfigurieren Sie Arbeitszeit-Limits und Pausenregeln
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="weeklyHours">Wöchentliche Soll-Arbeitszeit (Stunden)</Label>
            <Input
              id="weeklyHours"
              type="number"
              value={formData.weekly_hours_base}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                weekly_hours_base: parseFloat(e.target.value) || 0 
              }))}
              className="w-full sm:w-32"
              min={1}
              max={60}
              step={0.5}
              disabled={!canManage}
            />
            <p className="text-sm text-muted-foreground">
              Basis für Kapazitätsberechnung (z.B. 40 oder 42 Std.)
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="maxHours">Maximale Tagesstunden</Label>
            <Input
              id="maxHours"
              type="number"
              value={formData.max_daily_hours}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_daily_hours: parseFloat(e.target.value) || 0 
              }))}
              className="w-full sm:w-32"
              min={1}
              max={24}
              disabled={!canManage}
            />
            <p className="text-sm text-muted-foreground">
              Warnung bei Überschreitung
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="minBreakAfter">Mindestpause nach (Stunden)</Label>
            <Input
              id="minBreakAfter"
              type="number"
              value={formData.min_break_after_hours}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                min_break_after_hours: parseFloat(e.target.value) || 0 
              }))}
              className="w-full sm:w-32"
              min={1}
              max={12}
              disabled={!canManage}
            />
            <p className="text-sm text-muted-foreground">
              Nach dieser Zeit muss eine Pause eingeplant werden
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="minBreakDuration">Mindestpausendauer (Minuten)</Label>
            <Input
              id="minBreakDuration"
              type="number"
              value={formData.min_break_duration_minutes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                min_break_duration_minutes: parseInt(e.target.value) || 0 
              }))}
              className="w-full sm:w-32"
              min={15}
              max={120}
              step={5}
              disabled={!canManage}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Konflikte blockieren</Label>
              <p className="text-sm text-muted-foreground">
                Überlappende Einsätze verhindern
              </p>
            </div>
            <Switch 
              checked={formData.block_conflicts}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                block_conflicts: checked 
              }))}
              disabled={!canManage}
            />
          </div>
        </div>

        {/* Validation Alerts */}
        {validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, idx) => (
              <Alert key={idx} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                {issue.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {canManage && (
          <Button onClick={handleSave} disabled={saveSettings.isPending || hasErrors}>
            {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
