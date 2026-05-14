import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface WorktimeSettings {
  id: string;
  organization_id: string;
  weekly_hours_base: number;
  max_daily_hours: number;
  min_break_after_hours: number;
  min_break_duration_minutes: number;
  block_conflicts: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<WorktimeSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  weekly_hours_base: 40,
  max_daily_hours: 10,
  min_break_after_hours: 6,
  min_break_duration_minutes: 30,
  block_conflicts: true,
};

export function useWorktimeSettings() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["worktime-settings", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from("worktime_settings")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data with defaults if not found
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          organization_id: profile.organization_id,
        } as Partial<WorktimeSettings>;
      }
      
      return data as WorktimeSettings;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useSaveWorktimeSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      weekly_hours_base: number;
      max_daily_hours: number;
      min_break_after_hours: number;
      min_break_duration_minutes: number;
      block_conflicts: boolean;
    }) => {
      if (!profile?.organization_id) throw new Error("Keine Organisation gefunden");

      // Try to update first, then insert if not exists
      const { data: existing } = await supabase
        .from("worktime_settings")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("worktime_settings")
          .update(settings)
          .eq("organization_id", profile.organization_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("worktime_settings")
          .insert({
            organization_id: profile.organization_id,
            ...settings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worktime-settings"] });
      toast.success("Arbeitszeiteinstellungen gespeichert");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Speichern: ${message}`);
    },
  });
}
