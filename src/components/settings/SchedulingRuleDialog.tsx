import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import {
  SchedulingRule,
  SchedulingRuleType,
  SchedulingRuleCategory,
  RULE_TYPE_CONFIG,
  useCreateSchedulingRule,
  useUpdateSchedulingRule,
} from "@/hooks/use-scheduling-rules";
import { useEmployees } from "@/hooks/use-employees";

const formSchema = z.object({
  rule_type: z.string().min(1, "Regeltyp ist erforderlich"),
  rule_category: z.enum(["hard", "soft"]),
  name: z.string().min(1, "Name ist erforderlich").max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean(),
  parameters: z.record(z.unknown()),
  applies_to_employee_ids: z.array(z.string()).optional(),
  priority: z.number().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface SchedulingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: SchedulingRule | null;
}

export function SchedulingRuleDialog({ open, onOpenChange, rule }: SchedulingRuleDialogProps) {
  const createRule = useCreateSchedulingRule();
  const updateRule = useUpdateSchedulingRule();
  const { employees } = useEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const isEditing = !!rule;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rule_type: "",
      rule_category: "soft",
      name: "",
      description: "",
      is_active: true,
      parameters: {},
      applies_to_employee_ids: [],
      priority: 50,
    },
  });

  const selectedRuleType = form.watch("rule_type") as SchedulingRuleType;
  const ruleConfig = RULE_TYPE_CONFIG.find(c => c.type === selectedRuleType);

  useEffect(() => {
    if (rule) {
      form.reset({
        rule_type: rule.rule_type,
        rule_category: rule.rule_category,
        name: rule.name,
        description: rule.description || "",
        is_active: rule.is_active,
        parameters: rule.parameters,
        applies_to_employee_ids: rule.applies_to_employee_ids || [],
        priority: rule.priority,
      });
      setSelectedEmployees(rule.applies_to_employee_ids || []);
    } else {
      form.reset({
        rule_type: "",
        rule_category: "soft",
        name: "",
        description: "",
        is_active: true,
        parameters: {},
        applies_to_employee_ids: [],
        priority: 50,
      });
      setSelectedEmployees([]);
    }
  }, [rule, form, open]);

  // Update name and parameters when rule type changes
  useEffect(() => {
    if (ruleConfig && !isEditing) {
      form.setValue("name", ruleConfig.label);
      form.setValue("parameters", ruleConfig.defaultParams);
    }
  }, [selectedRuleType, ruleConfig, form, isEditing]);

  const onSubmit = async (values: FormValues) => {
    const data = {
      rule_type: values.rule_type as SchedulingRuleType,
      rule_category: values.rule_category,
      name: values.name,
      description: values.description || null,
      is_active: values.is_active,
      parameters: values.parameters,
      applies_to_employee_ids: selectedEmployees.length > 0 ? selectedEmployees : null,
      priority: values.priority,
    };

    if (isEditing && rule) {
      await updateRule.mutateAsync({ id: rule.id, ...data });
    } else {
      await createRule.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Regel bearbeiten" : "Neue Planungsregel"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Bearbeite die Parameter dieser Planungsregel"
              : "Erstelle eine neue Regel für die Einsatzplanung"
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Rule Type */}
              <FormField
                control={form.control}
                name="rule_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regeltyp</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wähle einen Regeltyp" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RULE_TYPE_CONFIG.map(config => (
                          <SelectItem key={config.type} value={config.type}>
                            <div className="flex flex-col">
                              <span>{config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {config.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rule Category */}
              <FormField
                control={form.control}
                name="rule_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hard">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">Hart</Badge>
                            <span className="text-sm">Muss eingehalten werden</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="soft">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Weich</Badge>
                            <span className="text-sm">Warnung bei Verstoss</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Regelname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Beschreibe die Regel..." rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic Parameters */}
              {ruleConfig && (
                <div className="space-y-4">
                  <FormLabel>Parameter</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {ruleConfig.parameterFields.map(paramField => (
                      <FormField
                        key={paramField.key}
                        control={form.control}
                        name={`parameters.${paramField.key}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">{paramField.label}</FormLabel>
                            <FormControl>
                              {paramField.type === "boolean" ? (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {field.value ? "Ja" : "Nein"}
                                  </span>
                                </div>
                              ) : paramField.type === "time" ? (
                                <TimeInput
                                  value={field.value as string || "08:00"}
                                  onChange={field.onChange}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={paramField.min}
                                    max={paramField.max}
                                    value={field.value as number || ""}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                  {paramField.unit && (
                                    <span className="text-sm text-muted-foreground">
                                      {paramField.unit}
                                    </span>
                                  )}
                                </div>
                              )}
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Apply to specific employees */}
              <div className="space-y-3">
                <FormLabel>Gilt für Mitarbeiter</FormLabel>
                <FormDescription>
                  Leer lassen für alle Mitarbeiter, oder spezifische auswählen
                </FormDescription>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {employees && employees.length > 0 ? (
                    <div className="space-y-2">
                      {employees.filter(e => e.isActive).map(emp => (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <Checkbox
                            checked={selectedEmployees.includes(emp.id)}
                            onCheckedChange={() => toggleEmployee(emp.id)}
                          />
                          <span className="text-sm">{emp.fullName || emp.email}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Mitarbeiter gefunden</p>
                  )}
                </div>
                {selectedEmployees.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployees.length} Mitarbeiter ausgewählt
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Aktiv</FormLabel>
                      <FormDescription>
                        Deaktivierte Regeln werden nicht geprüft
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Speichern" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
