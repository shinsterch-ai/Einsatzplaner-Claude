import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type SchedulingRuleType =
  | "max_hours_per_day"
  | "min_break_between_shifts"
  | "no_weekend_work"
  | "max_consecutive_days"
  | "max_hours_per_week"
  | "min_rest_per_week"
  | "no_night_shifts"
  | "max_patients_per_day"
  | "required_qualification";

export type SchedulingRuleCategory = "hard" | "soft";

export interface SchedulingRule {
  id: string;
  organization_id: string;
  rule_type: SchedulingRuleType;
  rule_category: SchedulingRuleCategory;
  name: string;
  description: string | null;
  parameters: Record<string, unknown>;
  applies_to_employee_ids: string[] | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface RuleTypeConfig {
  type: SchedulingRuleType;
  label: string;
  description: string;
  icon: string;
  defaultParams: Record<string, unknown>;
  parameterFields: {
    key: string;
    label: string;
    type: "number" | "time" | "boolean";
    min?: number;
    max?: number;
    unit?: string;
  }[];
}

export const RULE_TYPE_CONFIG: RuleTypeConfig[] = [
  {
    type: "max_hours_per_day",
    label: "Maximale Arbeitsstunden pro Tag",
    description: "Begrenzt die tägliche Arbeitszeit eines Mitarbeiters",
    icon: "Clock",
    defaultParams: { max_hours: 10 },
    parameterFields: [
      { key: "max_hours", label: "Maximale Stunden", type: "number", min: 1, max: 24, unit: "h" },
    ],
  },
  {
    type: "min_break_between_shifts",
    label: "Mindestpause zwischen Schichten",
    description: "Erzwingt eine Mindestpause zwischen zwei aufeinanderfolgenden Einsätzen",
    icon: "Coffee",
    defaultParams: { min_hours: 11 },
    parameterFields: [
      { key: "min_hours", label: "Mindestpause", type: "number", min: 1, max: 24, unit: "h" },
    ],
  },
  {
    type: "no_weekend_work",
    label: "Keine Wochenenddienste",
    description: "Verhindert Einsätze am Wochenende für ausgewählte Mitarbeiter",
    icon: "CalendarOff",
    defaultParams: { include_saturday: true, include_sunday: true },
    parameterFields: [
      { key: "include_saturday", label: "Samstag einschliessen", type: "boolean" },
      { key: "include_sunday", label: "Sonntag einschliessen", type: "boolean" },
    ],
  },
  {
    type: "max_consecutive_days",
    label: "Maximale aufeinanderfolgende Arbeitstage",
    description: "Begrenzt die Anzahl aufeinanderfolgender Arbeitstage",
    icon: "Calendar",
    defaultParams: { max_days: 6 },
    parameterFields: [
      { key: "max_days", label: "Maximale Tage", type: "number", min: 1, max: 14 },
    ],
  },
  {
    type: "max_hours_per_week",
    label: "Maximale Wochenstunden",
    description: "Begrenzt die wöchentliche Arbeitszeit",
    icon: "Clock",
    defaultParams: { max_hours: 42 },
    parameterFields: [
      { key: "max_hours", label: "Maximale Stunden", type: "number", min: 1, max: 80, unit: "h" },
    ],
  },
  {
    type: "min_rest_per_week",
    label: "Mindestruhezeit pro Woche",
    description: "Garantiert eine Mindestanzahl freier Stunden pro Woche",
    icon: "Moon",
    defaultParams: { min_hours: 35 },
    parameterFields: [
      { key: "min_hours", label: "Mindestruhezeit", type: "number", min: 1, max: 168, unit: "h" },
    ],
  },
  {
    type: "no_night_shifts",
    label: "Keine Nachtdienste",
    description: "Verhindert Einsätze nach einer bestimmten Uhrzeit",
    icon: "Moon",
    defaultParams: { after_time: "20:00" },
    parameterFields: [
      { key: "after_time", label: "Keine Einsätze nach", type: "time" },
    ],
  },
  {
    type: "max_patients_per_day",
    label: "Maximale Patienten pro Tag",
    description: "Begrenzt die Anzahl verschiedener Patienten pro Tag",
    icon: "Users",
    defaultParams: { max_patients: 8 },
    parameterFields: [
      { key: "max_patients", label: "Maximale Patienten", type: "number", min: 1, max: 30 },
    ],
  },
  {
    type: "required_qualification",
    label: "Erforderliche Qualifikation",
    description: "Erfordert bestimmte Qualifikationen für Einsatztypen",
    icon: "Award",
    defaultParams: { enforce_strictly: true },
    parameterFields: [
      { key: "enforce_strictly", label: "Strikt durchsetzen", type: "boolean" },
    ],
  },
];

export function useSchedulingRules() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["scheduling-rules", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("scheduling_rules")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SchedulingRule[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateSchedulingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (rule: {
      rule_type: SchedulingRuleType;
      rule_category: SchedulingRuleCategory;
      name: string;
      description?: string | null;
      parameters: Record<string, unknown>;
      applies_to_employee_ids?: string[] | null;
      is_active: boolean;
      priority: number;
    }) => {
      if (!profile?.organization_id) throw new Error("Keine Organisation gefunden");

      const { data, error } = await supabase
        .from("scheduling_rules")
        .insert({
          rule_type: rule.rule_type,
          rule_category: rule.rule_category,
          name: rule.name,
          description: rule.description,
          parameters: rule.parameters as unknown as Record<string, never>,
          applies_to_employee_ids: rule.applies_to_employee_ids,
          is_active: rule.is_active,
          priority: rule.priority,
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling-rules"] });
      toast({
        title: "Regel erstellt",
        description: "Die Planungsregel wurde erfolgreich erstellt.",
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

export function useUpdateSchedulingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      rule_category?: SchedulingRuleCategory;
      name?: string;
      description?: string | null;
      parameters?: Record<string, unknown>;
      applies_to_employee_ids?: string[] | null;
      is_active?: boolean;
      priority?: number;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.rule_category !== undefined) updateData.rule_category = updates.rule_category;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.parameters !== undefined) updateData.parameters = updates.parameters;
      if (updates.applies_to_employee_ids !== undefined) updateData.applies_to_employee_ids = updates.applies_to_employee_ids;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { data, error } = await supabase
        .from("scheduling_rules")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling-rules"] });
      toast({
        title: "Regel aktualisiert",
        description: "Die Planungsregel wurde erfolgreich aktualisiert.",
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

export function useDeleteSchedulingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduling_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling-rules"] });
      toast({
        title: "Regel gelöscht",
        description: "Die Planungsregel wurde erfolgreich gelöscht.",
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
