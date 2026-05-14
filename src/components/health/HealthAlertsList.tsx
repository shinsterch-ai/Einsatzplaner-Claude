import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Bot, 
  Clock,
  Bell
} from "lucide-react";
import { useHealthAlerts, useResolveAlert, HealthAlert } from "@/hooks/use-health-data";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alert: HealthAlert;
  onResolve: (id: string) => void;
  isResolving: boolean;
}

function AlertCard({ alert, onResolve, isResolving }: AlertCardProps) {
  const isCritical = alert.severity === "critical";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 transition-all",
        isCritical 
          ? "bg-red-50 border-red-500" 
          : "bg-yellow-50 border-yellow-500"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "p-2 rounded-full",
            isCritical ? "bg-red-100" : "bg-yellow-100"
          )}>
            {isCritical ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{alert.title}</h4>
              <Badge variant={isCritical ? "destructive" : "secondary"}>
                {isCritical ? "Kritisch" : "Warnung"}
              </Badge>
              {alert.notified_at && (
                <Badge variant="outline" className="gap-1">
                  <Bell className="h-3 w-3" />
                  Benachrichtigt
                </Badge>
              )}
            </div>
            {alert.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {alert.description}
              </p>
            )}
            {alert.ai_suggestion && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="text-xs font-medium">KI-Lösungsvorschlag</span>
                </div>
                <p className="text-sm text-blue-800">{alert.ai_suggestion}</p>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: de })}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onResolve(alert.id)}
          disabled={isResolving}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Schliessen
        </Button>
      </div>
    </div>
  );
}

export function HealthAlertsList() {
  const { data: alerts, isLoading } = useHealthAlerts(false);
  const resolveAlert = useResolveAlert();

  const criticalAlerts = alerts?.filter(a => a.severity === "critical") || [];
  const warningAlerts = alerts?.filter(a => a.severity === "warning") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktive Warnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktive Warnungen</CardTitle>
          <CardDescription>Keine aktiven Warnungen vorhanden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium text-lg">Alles in Ordnung!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Es gibt derzeit keine aktiven Systemwarnungen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Aktive Warnungen
          <Badge variant="destructive">{alerts.length}</Badge>
        </CardTitle>
        <CardDescription>
          Systemprobleme, die Aufmerksamkeit erfordern
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical alerts first */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Kritisch ({criticalAlerts.length})
            </h4>
            {criticalAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveAlert.mutate(id)}
                isResolving={resolveAlert.isPending}
              />
            ))}
          </div>
        )}

        {/* Warning alerts */}
        {warningAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnungen ({warningAlerts.length})
            </h4>
            {warningAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveAlert.mutate(id)}
                isResolving={resolveAlert.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
