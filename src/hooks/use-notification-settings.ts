import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationSettings {
  id: string;
  organization_id: string;
  notify_new_assignment: boolean;
  notify_assignment_changed: boolean;
  notify_assignment_cancelled: boolean;
  send_email: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  notify_new_assignment: true,
  notify_assignment_changed: true,
  notify_assignment_cancelled: true,
  send_email: false,
};

export function useNotificationSettings() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["notification-settings", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data with defaults if not found
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          organization_id: profile.organization_id,
        } as Partial<NotificationSettings>;
      }
      
      return data as NotificationSettings;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      notify_new_assignment: boolean;
      notify_assignment_changed: boolean;
      notify_assignment_cancelled: boolean;
      send_email: boolean;
    }) => {
      if (!profile?.organization_id) throw new Error("Keine Organisation gefunden");

      // Try to update first, then insert if not exists
      const { data: existing } = await supabase
        .from("notification_settings")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("notification_settings")
          .update(settings)
          .eq("organization_id", profile.organization_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("notification_settings")
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
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Benachrichtigungseinstellungen gespeichert");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Speichern: ${message}`);
    },
  });
}
