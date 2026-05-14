import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Database } from '@/lib/supabase/types';
import { UserWithRoles } from '@/hooks/use-users';

type AppRole = Database['public']['Enums']['app_role'];

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onSave: (data: {
    fullName: string;
    phone: string | null;
    isActive: boolean;
    newRole?: AppRole;
  }) => Promise<void>;
  isSaving?: boolean;
}

const roleLabels: Record<AppRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrator',
  planer: 'Einsatzplaner',
  mitarbeiter: 'Mitarbeiter:in',
};

// Roles that can be assigned by org admins
const assignableRoles: AppRole[] = ['admin', 'planer', 'mitarbeiter'];

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving = false,
}: UserEditDialogProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>('mitarbeiter');

  const currentRole = user?.roles.find((r) => r !== 'superadmin') || 'mitarbeiter';
  const isSuperadmin = user?.roles.includes('superadmin');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setIsActive(user.isActive);
      setSelectedRole(currentRole);
    }
  }, [user, currentRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSave({
      fullName,
      phone: phone || null,
      isActive,
      newRole: selectedRole !== currentRole ? selectedRole : undefined,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Vollständiger Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">E-Mail kann nicht geändert werden</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 123 45 67"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rolle</Label>
            {isSuperadmin ? (
              <Input value="Superadmin" disabled className="bg-muted" />
            ) : (
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Aktiv</Label>
              <p className="text-sm text-muted-foreground">
                Deaktivierte Benutzer können sich nicht anmelden
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSuperadmin}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
