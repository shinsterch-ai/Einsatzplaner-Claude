import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type HealthStatus = "healthy" | "degraded" | "error";
export type CheckType = "api" | "database" | "edge_function" | "component";
export type AlertSeverity = "warning" | "critical";
export type ComponentCategory = "page" | "component" | "hook" | "edge_function" | "table";

export interface HealthCheck {
  id: string;
  check_type: CheckType;
  target_name: string;
  status: HealthStatus;
  response_time_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface HealthAlert {
  id: string;
  check_id: string | null;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  ai_suggestion: string | null;
  is_resolved: boolean;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentRegistry {
  id: string;
  name: string;
  category: ComponentCategory;
  path: string | null;
  dependencies: string[];
  last_healthy: string | null;
  baseline_response_ms: number | null;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthSummary {
  total_components: number;
  healthy: number;
  degraded: number;
  errors: number;
  active_alerts: number;
  critical_alerts: number;
  last_check: string | null;
}

export function useHealthChecks(limit = 100) {
  return useQuery({
    queryKey: ["health-checks", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as HealthCheck[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useHealthAlerts(includeResolved = false) {
  return useQuery({
    queryKey: ["health-alerts", includeResolved],
    queryFn: async () => {
      let query = supabase
        .from("health_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!includeResolved) {
        query = query.eq("is_resolved", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HealthAlert[];
    },
    refetchInterval: 30000,
  });
}

export function useComponentRegistry() {
  return useQuery({
    queryKey: ["component-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("component_registry")
        .select("*")
        .order("is_critical", { ascending: false })
        .order("category")
        .order("name");

      if (error) throw error;
      return data as ComponentRegistry[];
    },
  });
}

export function useHealthSummary() {
  const { data: checks } = useHealthChecks(50);
  const { data: alerts } = useHealthAlerts(false);
  const { data: components } = useComponentRegistry();

  // Get the latest check for each component
  const latestChecks = new Map<string, HealthCheck>();
  checks?.forEach(check => {
    if (!latestChecks.has(check.target_name)) {
      latestChecks.set(check.target_name, check);
    }
  });

  const summary: HealthSummary = {
    total_components: components?.length || 0,
    healthy: Array.from(latestChecks.values()).filter(c => c.status === "healthy").length,
    degraded: Array.from(latestChecks.values()).filter(c => c.status === "degraded").length,
    errors: Array.from(latestChecks.values()).filter(c => c.status === "error").length,
    active_alerts: alerts?.length || 0,
    critical_alerts: alerts?.filter(a => a.severity === "critical").length || 0,
    last_check: checks?.[0]?.created_at || null,
  };

  return summary;
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("health_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-alerts"] });
      toast({
        title: "Warnung geschlossen",
        description: "Die Warnung wurde als gelöst markiert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });
}

export function useTriggerHealthCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("health-monitor");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["health-checks"] });
      queryClient.invalidateQueries({ queryKey: ["health-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["component-registry"] });
      toast({
        title: "Health-Check abgeschlossen",
        description: `${data.healthy} gesund, ${data.degraded} verlangsamt, ${data.errors} Fehler`,
      });
    },
    onError: (error) => {
      toast({
        title: "Health-Check fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });
}

export function useHealthRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("health-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "health_checks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["health-checks"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "health_alerts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["health-alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
