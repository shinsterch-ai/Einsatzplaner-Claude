import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Shield, 
  AlertTriangle,
  Clock,
  Coffee,
  CalendarOff,
  Calendar,
  Moon,
  Users,
  Award
} from "lucide-react";
import { 
  useSchedulingRules, 
  useDeleteSchedulingRule, 
  SchedulingRule,
  RULE_TYPE_CONFIG,
  SchedulingRuleType 
} from "@/hooks/use-scheduling-rules";
import { SchedulingRuleDialog } from "./SchedulingRuleDialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const iconMap: Record<string, React.ElementType> = {
  Clock,
  Coffee,
  CalendarOff,
  Calendar,
  Moon,
  Users,
  Award,
};

function getRuleIcon(ruleType: SchedulingRuleType): React.ElementType {
  const config = RULE_TYPE_CONFIG.find(c => c.type === ruleType);
  return config ? iconMap[config.icon] || Shield : Shield;
}

function getRuleLabel(ruleType: SchedulingRuleType): string {
  const config = RULE_TYPE_CONFIG.find(c => c.type === ruleType);
  return config?.label || ruleType;
}

function formatParameters(rule: SchedulingRule): string {
  const params = rule.parameters;
  const parts: string[] = [];
  
  if (params.max_hours) parts.push(`Max. ${params.max_hours}h`);
  if (params.min_hours) parts.push(`Min. ${params.min_hours}h`);
  if (params.max_days) parts.push(`Max. ${params.max_days} Tage`);
  if (params.max_patients) parts.push(`Max. ${params.max_patients} Patienten`);
  if (params.after_time) parts.push(`Nach ${params.after_time}`);
  if (params.include_saturday && params.include_sunday) parts.push("Sa + So");
  else if (params.include_saturday) parts.push("Samstag");
  else if (params.include_sunday) parts.push("Sonntag");
  
  return parts.join(", ");
}

export function SchedulingRulesSettings() {
  const { data: rules, isLoading } = useSchedulingRules();
  const deleteRule = useDeleteSchedulingRule();
  const [editingRule, setEditingRule] = useState<SchedulingRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const hardRules = rules?.filter(r => r.rule_category === "hard") || [];
  const softRules = rules?.filter(r => r.rule_category === "soft") || [];

  const handleEdit = (rule: SchedulingRule) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planungsregeln</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Planungsregeln
              </CardTitle>
              <CardDescription>
                Definiere Regeln für die automatische Einsatzplanung
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Regel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hard Rules Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded bg-red-100">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="font-medium">Harte Regeln</h3>
              <Badge variant="destructive">{hardRules.length}</Badge>
              <span className="text-xs text-muted-foreground ml-2">
                Müssen eingehalten werden
              </span>
            </div>
            {hardRules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Keine harten Regeln definiert
              </p>
            ) : (
              <div className="space-y-2">
                {hardRules.map(rule => (
                  <RuleCard 
                    key={rule.id} 
                    rule={rule} 
                    onEdit={() => handleEdit(rule)}
                    onDelete={() => setDeleteConfirmId(rule.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Soft Rules Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded bg-yellow-100">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="font-medium">Weiche Regeln</h3>
              <Badge variant="secondary">{softRules.length}</Badge>
              <span className="text-xs text-muted-foreground ml-2">
                Warnungen bei Verstössen
              </span>
            </div>
            {softRules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Keine weichen Regeln definiert
              </p>
            ) : (
              <div className="space-y-2">
                {softRules.map(rule => (
                  <RuleCard 
                    key={rule.id} 
                    rule={rule} 
                    onEdit={() => handleEdit(rule)}
                    onDelete={() => setDeleteConfirmId(rule.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SchedulingRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rule={editingRule}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Regel wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface RuleCardProps {
  rule: SchedulingRule;
  onEdit: () => void;
  onDelete: () => void;
}

function RuleCard({ rule, onEdit, onDelete }: RuleCardProps) {
  const Icon = getRuleIcon(rule.rule_type);
  const isHard = rule.rule_category === "hard";

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        !rule.is_active && "opacity-50",
        isHard ? "border-red-200 bg-red-50/50" : "border-yellow-200 bg-yellow-50/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isHard ? "bg-red-100" : "bg-yellow-100"
        )}>
          <Icon className={cn("h-5 w-5", isHard ? "text-red-600" : "text-yellow-600")} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{rule.name}</p>
            {!rule.is_active && (
              <Badge variant="outline" className="text-xs">Deaktiviert</Badge>
            )}
            {rule.applies_to_employee_ids && rule.applies_to_employee_ids.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {rule.applies_to_employee_ids.length} Mitarbeiter
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatParameters(rule)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
