'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Building2, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

type Organization = Database['public']['Tables']['organizations']['Row'];

const orgSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  code: z.string().min(2, 'Code muss mindestens 2 Zeichen haben').max(10, 'Code darf maximal 10 Zeichen haben'),
});

type OrgFormData = z.infer<typeof orgSchema>;

export default function OrganizationsPage() {
  const { isSuperadmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: '', code: '' },
  });

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      router.replace('/dashboard');
      toast.error('Zugriff verweigert - nur für Superadmins');
    }
  }, [authLoading, isSuperadmin, router]);

  useEffect(() => {
    if (isSuperadmin) fetchOrganizations();
  }, [isSuperadmin]);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Fehler beim Laden der Organisationen');
    } else {
      setOrganizations(data ?? []);
    }
    setIsLoading(false);
  };

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      form.reset({ name: org.name, code: org.code });
    } else {
      setEditingOrg(null);
      form.reset({ name: '', code: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (data: OrgFormData) => {
    setIsSubmitting(true);
    if (editingOrg) {
      const { error } = await supabase.from('organizations').update({ name: data.name, code: data.code }).eq('id', editingOrg.id);
      if (error) { toast.error('Fehler beim Aktualisieren: ' + error.message); }
      else { toast.success('Organisation aktualisiert'); setDialogOpen(false); fetchOrganizations(); }
    } else {
      const { error } = await supabase.from('organizations').insert({ name: data.name, code: data.code });
      if (error) {
        if (error.message.includes('duplicate key')) { toast.error('Dieser Code existiert bereits'); }
        else { toast.error('Fehler beim Erstellen: ' + error.message); }
      } else { toast.success('Organisation erstellt'); setDialogOpen(false); fetchOrganizations(); }
    }
    setIsSubmitting(false);
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;
    const { error } = await supabase.from('organizations').delete().eq('id', orgToDelete.id);
    if (error) { toast.error('Fehler beim Löschen: ' + error.message); }
    else { toast.success('Organisation gelöscht'); fetchOrganizations(); }
    setDeleteDialogOpen(false);
    setOrgToDelete(null);
  };

  const toggleOrgStatus = async (org: Organization) => {
    const { error } = await supabase.from('organizations').update({ is_active: !org.is_active }).eq('id', org.id);
    if (error) { toast.error('Fehler beim Ändern des Status'); }
    else { toast.success(org.is_active ? 'Organisation deaktiviert' : 'Organisation aktiviert'); fetchOrganizations(); }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organisationen</h1>
            <p className="text-muted-foreground">Verwaltung aller Spitex-Organisationen</p>
          </div>
          <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" />Neue Organisation</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Gesamt</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{organizations.length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Aktiv</CardTitle><Building2 className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{organizations.filter(o => o.is_active).length}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Inaktiv</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{organizations.filter(o => !o.is_active).length}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Organisationen</CardTitle>
            <CardDescription>Jede Organisation hat ihre eigenen Benutzer, Patienten und Einsätze</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : organizations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Noch keine Organisationen vorhanden</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell><code className="rounded bg-muted px-2 py-1 text-sm">{org.code}</code></TableCell>
                      <TableCell><Badge variant={org.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleOrgStatus(org)}>{org.is_active ? 'Aktiv' : 'Inaktiv'}</Badge></TableCell>
                      <TableCell>{format(new Date(org.created_at), 'dd.MM.yyyy', { locale: de })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/superadmin/organizations/${org.id}/users`)}><Users className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(org)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setOrgToDelete(org); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
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
              <DialogTitle>{editingOrg ? 'Organisation bearbeiten' : 'Neue Organisation'}</DialogTitle>
              <DialogDescription>{editingOrg ? 'Ändern Sie die Organisationsdaten' : 'Erstellen Sie eine neue Spitex-Organisation'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Spitex Zürich Nord" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="ZH-NORD" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingOrg ? 'Speichern' : 'Erstellen'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Organisation löschen?</AlertDialogTitle>
              <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden. Alle Benutzer und Daten dieser Organisation werden ebenfalls gelöscht.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
