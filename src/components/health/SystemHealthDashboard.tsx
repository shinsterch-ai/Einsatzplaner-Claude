import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  XCircle,
  Zap
} from "lucide-react";
import { useHealthSummary, useTriggerHealthCheck } from "@/hooks/use-health-data";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function SystemHealthDashboard() {
  const summary = useHealthSummary();
  const triggerCheck = useTriggerHealthCheck();

  const getOverallStatus = () => {
    if (summary.errors > 0 || summary.critical_alerts > 0) return "error";
    if (summary.degraded > 0 || summary.active_alerts > 0) return "degraded";
    return "healthy";
  };

  const overallStatus = getOverallStatus();

  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      label: "Alle Systeme operativ",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    degraded: {
      icon: AlertTriangle,
      label: "Eingeschränkte Leistung",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
    },
    error: {
      icon: XCircle,
      label: "Systemprobleme erkannt",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("transition-all", config.border, config.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <StatusIcon className={cn("h-6 w-6", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">System-Status</CardTitle>
              <CardDescription className={config.color}>
                {config.label}
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => triggerCheck.mutate()}
            disabled={triggerCheck.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", triggerCheck.isPending && "animate-spin")} />
            Jetzt prüfen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Healthy */}
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{summary.healthy}</p>
              <p className="text-xs text-muted-foreground">Gesund</p>
            </div>
          </div>

          {/* Degraded */}
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="p-2 rounded-full bg-yellow-100">
              <Zap className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{summary.degraded}</p>
              <p className="text-xs text-muted-foreground">Langsam</p>
            </div>
          </div>

          {/* Errors */}
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="p-2 rounded-full bg-red-100">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-xs text-muted-foreground">Fehler</p>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
            <div className="p-2 rounded-full bg-orange-100">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{summary.active_alerts}</p>
              <p className="text-xs text-muted-foreground">Warnungen</p>
            </div>
          </div>
        </div>

        {/* Last check info */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Letzte Prüfung:{" "}
              {summary.last_check
                ? formatDistanceToNow(new Date(summary.last_check), {
                    addSuffix: true,
                    locale: de,
                  })
                : "Noch keine Prüfung durchgeführt"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {summary.total_components} Komponenten überwacht
            </span>
          </div>
        </div>

        {/* Critical alerts badge */}
        {summary.critical_alerts > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              {summary.critical_alerts} kritische Warnung(en) erfordern sofortige Aufmerksamkeit
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
