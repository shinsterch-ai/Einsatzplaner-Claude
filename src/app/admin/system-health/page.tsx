'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { SystemHealthDashboard } from '@/components/health/SystemHealthDashboard';
import { ComponentHealthGrid } from '@/components/health/ComponentHealthGrid';
import { HealthAlertsList } from '@/components/health/HealthAlertsList';
import { HealthHistoryChart } from '@/components/health/HealthHistoryChart';
import { useHealthRealtimeUpdates } from '@/hooks/use-health-data';
import { Activity } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function SystemHealthPage() {
  const { isSuperadmin } = useAuth();
  const { isDemoMode } = useDemoMode();
  const router = useRouter();

  useHealthRealtimeUpdates();

  useEffect(() => {
    if (!isSuperadmin) router.replace('/dashboard');
  }, [isSuperadmin, router]);

  if (!isSuperadmin) return null;

  if (isDemoMode) return <DemoHealthPage />;

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">System-Status</h1>
            <p className="text-muted-foreground">KI-gestützte Überwachung aller Systemkomponenten</p>
          </div>
        </div>
        <SystemHealthDashboard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HealthAlertsList />
          <HealthHistoryChart />
        </div>
        <ComponentHealthGrid />
      </div>
    </AppLayout>
  );
}

function DemoHealthPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10"><Activity className="h-6 w-6 text-orange-500" /></div>
          <div>
            <h1 className="text-2xl font-bold">System-Status</h1>
            <p className="text-muted-foreground">Demo-Modus: Beispieldaten werden angezeigt</p>
          </div>
        </div>
        <div className="p-6 rounded-lg border bg-green-50 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100"><Activity className="h-6 w-6 text-green-600" /></div>
            <div><h2 className="font-semibold">Alle Systeme operativ</h2><p className="text-sm text-green-600">Demo-Umgebung läuft stabil</p></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg border"><p className="text-2xl font-bold text-green-600">12</p><p className="text-xs text-muted-foreground">Gesund</p></div>
            <div className="p-3 bg-white rounded-lg border"><p className="text-2xl font-bold text-yellow-600">1</p><p className="text-xs text-muted-foreground">Langsam</p></div>
            <div className="p-3 bg-white rounded-lg border"><p className="text-2xl font-bold text-red-600">0</p><p className="text-xs text-muted-foreground">Fehler</p></div>
            <div className="p-3 bg-white rounded-lg border"><p className="text-2xl font-bold text-orange-600">1</p><p className="text-xs text-muted-foreground">Warnungen</p></div>
          </div>
        </div>
        <div className="p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Demo-Warnungen</h3>
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium">Edge Function "suggest-assignments" langsam</p>
                <p className="text-sm text-muted-foreground mt-1">Antwortzeit: 3200ms (normal: ~800ms)</p>
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <strong className="text-blue-700">KI-Vorschlag:</strong> Prüfe die AI-Gateway Konfiguration und Rate-Limits.
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-center text-muted-foreground">Im Demo-Modus werden keine echten Health-Checks durchgeführt.</p>
      </div>
    </AppLayout>
  );
}
