'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, MoreHorizontal, Shield, Users as UsersIcon, Calendar, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useUsers, UserWithRoles } from '@/hooks/use-users';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/supabase/types';
import { AppLayout } from '@/components/layout/AppLayout';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  superadmin: { label: 'Superadmin', icon: Shield, color: 'bg-destructive/10 text-destructive' },
  admin: { label: 'Administrator', icon: Shield, color: 'bg-primary/10 text-primary' },
  planer: { label: 'Einsatzplaner', icon: Calendar, color: 'bg-chart-3/20 text-chart-3' },
  mitarbeiter: { label: 'Mitarbeiter:in', icon: UsersIcon, color: 'bg-chart-2/20 text-chart-2' },
};

export default function UsersPage() {
  const { users, isLoading, updateUser, updateUserRole, toggleUserActive } = useUsers();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getPrimaryRole = (roles: AppRole[]): AppRole => {
    if (roles.includes('superadmin')) return 'superadmin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('planer')) return 'planer';
    return 'mitarbeiter';
  };

  const filteredUsers = users.filter((user) => {
    const name = user.fullName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const roleStats = {
    admin: users.filter(u => u.roles.includes('admin')).length,
    planer: users.filter(u => u.roles.includes('planer')).length,
    mitarbeiter: users.filter(u => u.roles.includes('mitarbeiter')).length,
  };

  const handleSaveUser = async (data: { fullName: string; phone: string | null; isActive: boolean; newRole?: AppRole }) => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateUser.mutateAsync({ userId: editingUser.id, data: { fullName: data.fullName, phone: data.phone, isActive: data.isActive } });
      if (data.newRole) {
        const currentRole = getPrimaryRole(editingUser.roles);
        if (currentRole !== 'superadmin') {
          await updateUserRole.mutateAsync({ userId: editingUser.id, oldRole: currentRole, newRole: data.newRole });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: UserWithRoles) => {
    if (user.roles.includes('superadmin')) return;
    if (user.id === currentUser?.id) return;
    await toggleUserActive.mutateAsync({ userId: user.id, isActive: !user.isActive });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          <Card><CardContent className="p-6"><div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div></CardContent></Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Benutzer</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Verwalten Sie Benutzer und Berechtigungen</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" disabled><Plus className="h-4 w-4" />Benutzer hinzufügen</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {(['admin', 'planer', 'mitarbeiter'] as const).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            return (
              <Card key={role}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full ${config.color} flex items-center justify-center`}><Icon className="h-6 w-6" /></div>
                    <div><p className="text-2xl font-bold">{roleStats[role]}</p><p className="text-sm text-muted-foreground">{config.label}</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Alle Benutzer ({users.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keine Benutzer gefunden</p>
            ) : (
              <>
                <div className="md:hidden divide-y">
                  {filteredUsers.map(user => {
                    const primaryRole = getPrimaryRole(user.roles);
                    const roleInfo = roleConfig[primaryRole];
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <div key={user.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(user.fullName)}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.fullName || user.email}{isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(Sie)</span>}</p>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingUser(user); setEditDialogOpen(true); }}>Bearbeiten</DropdownMenuItem>
                              {!user.roles.includes('superadmin') && !isCurrentUser && <DropdownMenuItem onClick={() => handleToggleActive(user)} className={user.isActive ? 'text-destructive' : ''}>{user.isActive ? 'Deaktivieren' : 'Aktivieren'}</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={roleInfo.color}>{roleInfo.label}</Badge>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Aktiv' : 'Deaktiviert'}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(user.createdAt), 'd. MMM yyyy', { locale: de })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Benutzer</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erstellt am</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => {
                        const primaryRole = getPrimaryRole(user.roles);
                        const roleInfo = roleConfig[primaryRole];
                        const isCurrentUser = user.id === currentUser?.id;
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(user.fullName)}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium">{user.fullName || user.email}{isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(Sie)</span>}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className={roleInfo.color}>{roleInfo.label}</Badge></TableCell>
                            <TableCell><Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Aktiv' : 'Deaktiviert'}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{format(new Date(user.createdAt), 'd. MMM yyyy', { locale: de })}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingUser(user); setEditDialogOpen(true); }}>Bearbeiten</DropdownMenuItem>
                                  {!user.roles.includes('superadmin') && !isCurrentUser && <DropdownMenuItem onClick={() => handleToggleActive(user)} className={user.isActive ? 'text-destructive' : ''}>{user.isActive ? 'Deaktivieren' : 'Aktivieren'}</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <UserEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} user={editingUser} onSave={handleSaveUser} isSaving={isSaving} />
      </div>
    </AppLayout>
  );
}
