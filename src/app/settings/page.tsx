'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationLogoUpload } from '@/components/settings/OrganizationLogoUpload';
import { SchedulingRulesSettings } from '@/components/settings/SchedulingRulesSettings';
import { RolesPermissionsOverview } from '@/components/settings/RolesPermissionsOverview';
import { AssignmentTypesSettings } from '@/components/settings/AssignmentTypesSettings';
import { WorktimeSettings } from '@/components/settings/WorktimeSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { MapPin, Tag, Clock, Bell, Building2, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  const { isOrgAdmin, isSuperadmin, organization, refreshOrganization } = useAuth();
  const canManageOrg = isOrgAdmin || isSuperadmin;

  const [orgName, setOrgName] = useState(organization?.name || '');
  const [orgCode, setOrgCode] = useState(organization?.code || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOrganization = async () => {
    if (!organization) return;
    if (!orgName.trim() || !orgCode.trim()) { toast.error('Name und Kürzel sind erforderlich'); return; }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('organizations').update({ name: orgName.trim(), code: orgCode.trim().toUpperCase() }).eq('id', organization.id);
      if (error) throw error;
      await refreshOrganization();
      toast.success('Organisationsdaten gespeichert');
    } catch (error: any) {
      toast.error(`Fehler beim Speichern: ${error?.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground mt-1">Systemkonfiguration und Verwaltung</p>
        </div>

        <Tabs defaultValue={canManageOrg && organization ? "organization" : "types"} className="w-full">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            {canManageOrg && organization && (
              <TabsTrigger value="organization" className="gap-1.5 text-xs sm:text-sm">
                <Building2 className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Organisation</span><span className="sm:hidden">Org</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="types" className="gap-1.5 text-xs sm:text-sm"><Tag className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Einsatztypen</span><span className="sm:hidden">Typen</span></TabsTrigger>
            <TabsTrigger value="worktime" className="gap-1.5 text-xs sm:text-sm"><Clock className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Arbeitszeit</span><span className="sm:hidden">Zeit</span></TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Planungsregeln</span><span className="sm:hidden">Regeln</span></TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm"><Bell className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Benachrichtigungen</span><span className="sm:hidden">Alerts</span></TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm"><ShieldCheck className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Rollen & Rechte</span><span className="sm:hidden">Rollen</span></TabsTrigger>
          </TabsList>

          {canManageOrg && organization && (
            <TabsContent value="organization">
              <div className="space-y-6">
                <OrganizationLogoUpload />
                <Card>
                  <CardHeader>
                    <CardTitle>Organisationsdetails</CardTitle>
                    <CardDescription>Grundlegende Informationen Ihrer Organisation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="orgName">Name</Label>
                      <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="orgCode">Kürzel</Label>
                      <Input id="orgCode" value={orgCode} onChange={(e) => setOrgCode(e.target.value)} className="w-32" />
                    </div>
                    <Button onClick={handleSaveOrganization} disabled={isSaving}>
                      {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichern...</> : 'Speichern'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="types"><AssignmentTypesSettings /></TabsContent>
          <TabsContent value="worktime"><WorktimeSettings /></TabsContent>
          <TabsContent value="rules"><SchedulingRulesSettings /></TabsContent>
          <TabsContent value="notifications"><NotificationSettings /></TabsContent>
          <TabsContent value="roles"><RolesPermissionsOverview /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
