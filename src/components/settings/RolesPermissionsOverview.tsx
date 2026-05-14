import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const permissions = [
  {
    category: 'Einsatzplanung',
    items: [
      { action: 'Wochenplan ansehen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Einsätze erstellen/bearbeiten', admin: true, planer: true, mitarbeiter: false },
      { action: 'Einsätze löschen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Eigene Einsätze ansehen', admin: true, planer: true, mitarbeiter: true },
      { action: 'Einsatzstatus aktualisieren', admin: true, planer: true, mitarbeiter: true },
    ],
  },
  {
    category: 'Klienten',
    items: [
      { action: 'Alle Klienten ansehen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Klienten erstellen/bearbeiten', admin: true, planer: true, mitarbeiter: false },
      { action: 'Klienten löschen', admin: true, planer: false, mitarbeiter: false },
      { action: 'Zugewiesene Klienten ansehen', admin: true, planer: true, mitarbeiter: true },
    ],
  },
  {
    category: 'Mitarbeiter',
    items: [
      { action: 'Mitarbeiter ansehen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Mitarbeiter erstellen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Verfügbarkeit verwalten', admin: true, planer: false, mitarbeiter: false },
      { action: 'Eigene Verfügbarkeit ansehen', admin: true, planer: true, mitarbeiter: true },
    ],
  },
  {
    category: 'Verwaltung',
    items: [
      { action: 'Benutzer verwalten', admin: true, planer: false, mitarbeiter: false },
      { action: 'Einstellungen bearbeiten', admin: true, planer: false, mitarbeiter: false },
      { action: 'Arbeitszeitkonto ansehen', admin: true, planer: true, mitarbeiter: false },
      { action: 'Ferien verwalten', admin: true, planer: true, mitarbeiter: false },
      { action: 'Benachrichtigungen konfigurieren', admin: true, planer: false, mitarbeiter: false },
    ],
  },
];

function PermissionIcon({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/40" />
  );
}

export function RolesPermissionsOverview() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Hinweis zur Mitarbeiter-Erstellung:</strong> Sowohl Admin als auch Planer können neue Mitarbeiter anlegen. 
          Der neue Mitarbeiter erhält automatisch ein temporäres Passwort und muss dieses beim ersten Login ändern.
        </AlertDescription>
      </Alert>

      {permissions.map((group) => (
        <Card key={group.category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.category}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Aktion</th>
                    <th className="text-center py-2 font-medium w-24">
                      <Badge variant="default" className="text-xs">Admin</Badge>
                    </th>
                    <th className="text-center py-2 font-medium w-24">
                      <Badge variant="secondary" className="text-xs">Planer</Badge>
                    </th>
                    <th className="text-center py-2 font-medium w-28">
                      <Badge variant="outline" className="text-xs">Mitarbeiter</Badge>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.action} className="border-b last:border-0">
                      <td className="py-2.5">{item.action}</td>
                      <td className="text-center py-2.5">
                        <div className="flex justify-center"><PermissionIcon allowed={item.admin} /></div>
                      </td>
                      <td className="text-center py-2.5">
                        <div className="flex justify-center"><PermissionIcon allowed={item.planer} /></div>
                      </td>
                      <td className="text-center py-2.5">
                        <div className="flex justify-center"><PermissionIcon allowed={item.mitarbeiter} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {group.items.map((item) => (
                <div key={item.action} className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">{item.action}</p>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { label: 'Admin', allowed: item.admin },
                      { label: 'Planer', allowed: item.planer },
                      { label: 'MA', allowed: item.mitarbeiter },
                    ].map((role) => (
                      <div key={role.label} className="flex items-center gap-1.5 text-xs">
                        <PermissionIcon allowed={role.allowed} />
                        <span className={role.allowed ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {role.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
