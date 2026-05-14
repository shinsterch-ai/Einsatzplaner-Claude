import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useNotificationSettings, useSaveNotificationSettings } from "@/hooks/use-notification-settings";
import { useAuth } from "@/contexts/AuthContext";

export function NotificationSettings() {
  const { isOrgAdmin, isSuperadmin } = useAuth();
  const canManage = isOrgAdmin || isSuperadmin;
  
  const { data: settings, isLoading } = useNotificationSettings();
  const saveSettings = useSaveNotificationSettings();

  const [formData, setFormData] = useState({
    notify_new_assignment: true,
    notify_assignment_changed: true,
    notify_assignment_cancelled: true,
    send_email: false,
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        notify_new_assignment: settings.notify_new_assignment ?? true,
        notify_assignment_changed: settings.notify_assignment_changed ?? true,
        notify_assignment_cancelled: settings.notify_assignment_cancelled ?? true,
        send_email: settings.send_email ?? false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
        <CardTitle>Benachrichtigungen</CardTitle>
        <CardDescription>
          Konfigurieren Sie, wann Mitarbeitende benachrichtigt werden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Neue Zuweisung</Label>
            <p className="text-sm text-muted-foreground">
              Bei neuen Einsatzzuweisungen
            </p>
          </div>
          <Switch 
            checked={formData.notify_new_assignment}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              notify_new_assignment: checked 
            }))}
            disabled={!canManage}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Einsatzänderungen</Label>
            <p className="text-sm text-muted-foreground">
              Bei Zeit- oder Ortsänderungen
            </p>
          </div>
          <Switch 
            checked={formData.notify_assignment_changed}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              notify_assignment_changed: checked 
            }))}
            disabled={!canManage}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Stornierungen</Label>
            <p className="text-sm text-muted-foreground">
              Bei stornierten Einsätzen
            </p>
          </div>
          <Switch 
            checked={formData.notify_assignment_cancelled}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              notify_assignment_cancelled: checked 
            }))}
            disabled={!canManage}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>E-Mail Benachrichtigungen</Label>
            <p className="text-sm text-muted-foreground">
              Zusätzlich per E-Mail benachrichtigen
            </p>
          </div>
          <Switch 
            checked={formData.send_email}
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              send_email: checked 
            }))}
            disabled={!canManage}
          />
        </div>

        {canManage && (
          <Button onClick={handleSave} disabled={saveSettings.isPending} className="mt-4">
            {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
