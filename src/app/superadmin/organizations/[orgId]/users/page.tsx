'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowLeft, Plus, Loader2, Shield, UserCog, Calendar, Users as UsersIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

const roleLabels: Record<AppRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrator',
  planer: 'Planer',
  mitarbeiter: 'Mitarbeiter',
};

const roleIcons: Record<AppRole, typeof Shield> = {
  superadmin: Shield,
  admin: UserCog,
  planer: Calendar,
  mitarbeiter: UsersIcon,
};

const roleColors: Record<AppRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  planer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  mitarbeiter: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const addUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  role: z.enum(['admin', 'planer', 'mitarbeiter'] as const),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

export default function OrgUsersPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { isSuperadmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { email: '', fullName: '', password: '', role: 'mitarbeiter' },
  });

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      router.replace('/dashboard');
      toast.error('Zugriff verweigert');
    }
  }, [authLoading, isSuperadmin, router]);

  useEffect(() => {
    if (isSuperadmin && orgId) {
      fetchOrganization();
      fetchUsers();
    }
  }, [isSuperadmin, orgId]);

  const fetchOrganization = async () => {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (error) {
      toast.error('Organisation nicht gefunden');
      router.push('/superadmin/organizations');
    } else {
      setOrganization(data);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    if (profilesError) {
      toast.error('Fehler beim Laden der Benutzer');
      setIsLoading(false);
      return;
    }
    const userIds = profiles?.map(p => p.id) ?? [];
    const { data: roles } = await supabase.from('user_roles').select('*').in('user_id', userIds);
    const usersWithRoles: UserWithRoles[] = (profiles ?? []).map(profile => ({
      ...profile,
      roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) ?? [],
    }));
    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  const handleAddUser = async (data: AddUserFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-org-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ email: data.email, password: data.password, fullName: data.fullName, role: data.role, organizationId: orgId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Fehler beim Erstellen des Benutzers');
      toast.success('Benutzer erfolgreich erstellt');
      setDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen des Benutzers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (authLoading || !isSuperadmin) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/superadmin/organizations')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{organization?.name ?? 'Laden...'}</h1>
            <p className="text-muted-foreground">Benutzerverwaltung für diese Organisation</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gesamt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent></Card>
          {(['admin', 'planer', 'mitarbeiter'] as const).map(role => (
            <Card key={role}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{roleLabels[role]}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{users.filter(u => u.roles.includes(role)).length}</div></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Benutzer</CardTitle><CardDescription>Alle Benutzer dieser Organisation</CardDescription></div>
              <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Benutzer hinzufügen</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Noch keine Benutzer in dieser Organisation</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Rollen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar><AvatarFallback>{getInitials(user.full_name)}</AvatarFallback></Avatar>
                          <div><div className="font-medium">{user.full_name ?? 'Unbekannt'}</div><div className="text-sm text-muted-foreground">{user.email}</div></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Keine Rolle</span>
                          ) : (
                            user.roles.map(role => {
                              const Icon = roleIcons[role];
                              return <Badge key={role} className={roleColors[role]}><Icon className="mr-1 h-3 w-3" />{roleLabels[role]}</Badge>;
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={user.is_active ? 'default' : 'secondary'}>{user.is_active ? 'Aktiv' : 'Inaktiv'}</Badge></TableCell>
                      <TableCell>{format(new Date(user.created_at), 'dd.MM.yyyy', { locale: de })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Benutzer hinzufügen</DialogTitle>
              <DialogDescription>Erstellen Sie einen neuen Benutzer für {organization?.name}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Max Muster" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-Mail</FormLabel><FormControl><Input type="email" placeholder="max@beispiel.ch" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Passwort</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Rolle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Rolle auswählen" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="planer">Planer</SelectItem>
                        <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Erstellen</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
