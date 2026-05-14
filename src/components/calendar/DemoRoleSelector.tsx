import { useDemoMode, SimulatedRole } from '@/contexts/DemoModeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCog } from 'lucide-react';

const ROLE_LABELS: Record<SimulatedRole, string> = {
  admin: 'Admin',
  planer: 'Planer',
  mitarbeiter: 'Mitarbeiter',
};

export function DemoRoleSelector() {
  const { hasRole } = useAuth();
  const { isDemoMode, simulatedRole, setSimulatedRole } = useDemoMode();
  
  // Only show for superadmins in demo mode
  const isSuperadmin = hasRole(['superadmin']);
  
  if (!isDemoMode || !isSuperadmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
      <UserCog className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Ansicht als:</span>
      <Select value={simulatedRole} onValueChange={(value) => setSimulatedRole(value as SimulatedRole)}>
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as SimulatedRole[]).map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
