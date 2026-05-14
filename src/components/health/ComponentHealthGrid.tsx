import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Database, 
  Code2, 
  FileCode, 
  Layout,
  Puzzle,
  Clock
} from "lucide-react";
import { useComponentRegistry, useHealthChecks, ComponentCategory, HealthStatus } from "@/hooks/use-health-data";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

const categoryConfig: Record<ComponentCategory, { icon: React.ElementType; label: string }> = {
  edge_function: { icon: Code2, label: "Edge Function" },
  table: { icon: Database, label: "Datenbank" },
  page: { icon: Layout, label: "Seite" },
  component: { icon: Puzzle, label: "Komponente" },
  hook: { icon: FileCode, label: "Hook" },
};

const statusConfig: Record<HealthStatus | "unknown", { icon: React.ElementType; color: string; bg: string }> = {
  healthy: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  degraded: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  unknown: { icon: Clock, color: "text-gray-400", bg: "bg-gray-100" },
};

export function ComponentHealthGrid() {
  const { data: components, isLoading } = useComponentRegistry();
  const { data: checks } = useHealthChecks(100);

  // Build a map of latest status per component
  const latestStatus = new Map<string, { status: HealthStatus; time: string; responseMs: number | null }>();
  checks?.forEach(check => {
    if (!latestStatus.has(check.target_name)) {
      latestStatus.set(check.target_name, {
        status: check.status,
        time: check.created_at,
        responseMs: check.response_time_ms,
      });
    }
  });

  // Group components by category
  const groupedComponents = components?.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {} as Record<ComponentCategory, typeof components>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Komponenten-Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Komponenten-Übersicht</CardTitle>
        <CardDescription>
          Status aller überwachten Systemkomponenten
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupedComponents && Object.entries(groupedComponents).map(([category, comps]) => {
          const config = categoryConfig[category as ComponentCategory];
          const CategoryIcon = config.icon;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {comps?.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {comps?.map(comp => {
                  const check = latestStatus.get(comp.name);
                  const status = check?.status || "unknown";
                  const statusCfg = statusConfig[status];
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div
                      key={comp.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                        status === "error" && "border-red-200 bg-red-50",
                        status === "degraded" && "border-yellow-200 bg-yellow-50",
                        status === "healthy" && "border-green-200 bg-green-50",
                        status === "unknown" && "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={comp.name}>
                            {comp.name}
                          </p>
                          {check?.responseMs && (
                            <p className="text-xs text-muted-foreground">
                              {check.responseMs}ms
                            </p>
                          )}
                        </div>
                        <div className={cn("p-1.5 rounded-full", statusCfg.bg)}>
                          <StatusIcon className={cn("h-3.5 w-3.5", statusCfg.color)} />
                        </div>
                      </div>
                      {comp.is_critical && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Kritisch
                        </Badge>
                      )}
                      {check?.time && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(check.time), { addSuffix: true, locale: de })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
