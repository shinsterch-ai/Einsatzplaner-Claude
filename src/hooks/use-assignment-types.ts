import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface AssignmentType {
  id: string;
  organization_id: string;
  code: string;
  label: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useAssignmentTypes() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["assignment-types", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("assignment_types")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });

      if (error) throw error;
      return data as AssignmentType[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateAssignmentType() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (type: {
      code: string;
      label: string;
      color?: string;
      sort_order?: number;
    }) => {
      if (!profile?.organization_id) throw new Error("Keine Organisation gefunden");

      const { data, error } = await supabase
        .from("assignment_types")
        .insert({
          organization_id: profile.organization_id,
          code: type.code.toLowerCase().replace(/\s+/g, '_'),
          label: type.label,
          color: type.color || 'primary',
          sort_order: type.sort_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-types"] });
      toast.success("Einsatztyp erstellt");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Erstellen: ${message}`);
    },
  });
}

export function useUpdateAssignmentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      code?: string;
      label?: string;
      color?: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("assignment_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-types"] });
      toast.success("Einsatztyp aktualisiert");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Aktualisieren: ${message}`);
    },
  });
}

export function useDeleteAssignmentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assignment_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-types"] });
      toast.success("Einsatztyp gelöscht");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(`Fehler beim Löschen: ${message}`);
    },
  });
}
