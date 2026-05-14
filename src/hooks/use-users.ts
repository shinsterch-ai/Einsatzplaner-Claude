import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/lib/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface UserWithRoles {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  roles: AppRole[];
}

export function useUsers() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch profiles for organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organization.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // For each profile, fetch their roles
      const users: UserWithRoles[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            phone: profile.phone,
            isActive: profile.is_active,
            createdAt: profile.created_at,
            roles: (rolesData || []).map((r) => r.role),
          };
        })
      );

      return users;
    },
    enabled: !!organization?.id,
  });

  const updateUser = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: {
        fullName?: string;
        phone?: string | null;
        isActive?: boolean;
      };
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone,
          is_active: data.isActive,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Benutzer aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({
      userId,
      oldRole,
      newRole,
    }: {
      userId: string;
      oldRole: AppRole;
      newRole: AppRole;
    }) => {
      // Delete old role (if not superadmin)
      if (oldRole !== 'superadmin') {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', oldRole);
      }

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) {
        console.error('Error updating role:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rolle aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Rolle');
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling user status:', error);
        throw error;
      }
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isActive ? 'Benutzer aktiviert' : 'Benutzer deaktiviert');
    },
    onError: () => {
      toast.error('Fehler beim Ändern des Status');
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    refetch: usersQuery.refetch,
    updateUser,
    updateUserRole,
    toggleUserActive,
  };
}
