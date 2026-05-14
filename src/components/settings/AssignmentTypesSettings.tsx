import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import {
  useAssignmentTypes,
  useCreateAssignmentType,
  useUpdateAssignmentType,
  useDeleteAssignmentType,
  AssignmentType,
} from "@/hooks/use-assignment-types";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { value: "primary", label: "Blau", class: "bg-primary" },
  { value: "destructive", label: "Rot", class: "bg-destructive" },
  { value: "secondary", label: "Grau", class: "bg-secondary" },
  { value: "chart-1", label: "Orange", class: "bg-orange-500" },
  { value: "chart-2", label: "Grün", class: "bg-green-500" },
  { value: "chart-3", label: "Violett", class: "bg-purple-500" },
  { value: "chart-4", label: "Gelb", class: "bg-yellow-500" },
  { value: "chart-5", label: "Türkis", class: "bg-cyan-500" },
];

function getColorClass(color: string): string {
  const option = COLOR_OPTIONS.find(o => o.value === color);
  return option?.class || "bg-primary";
}

export function AssignmentTypesSettings() {
  const { isOrgAdmin, isSuperadmin } = useAuth();
  const canManage = isOrgAdmin || isSuperadmin;
  
  const { data: types, isLoading } = useAssignmentTypes();
  const createType = useCreateAssignmentType();
  const updateType = useUpdateAssignmentType();
  const deleteType = useDeleteAssignmentType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AssignmentType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: "",
    code: "",
    color: "primary",
  });

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({ label: "", code: "", color: "primary" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (type: AssignmentType) => {
    setEditingType(type);
    setFormData({
      label: type.label,
      code: type.code,
      color: type.color,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) return;

    if (editingType) {
      await updateType.mutateAsync({
        id: editingType.id,
        label: formData.label.trim(),
        code: formData.code.trim() || formData.label.toLowerCase().replace(/\s+/g, '_'),
        color: formData.color,
      });
    } else {
      await createType.mutateAsync({
        label: formData.label.trim(),
        code: formData.code.trim() || formData.label.toLowerCase().replace(/\s+/g, '_'),
        color: formData.color,
      });
    }
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (type: AssignmentType) => {
    setTogglingId(type.id);
    try {
      await updateType.mutateAsync({
        id: type.id,
        is_active: !type.is_active,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteType.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Separate active and inactive types
  const activeTypes = types?.filter(t => t.is_active) || [];
  const inactiveTypes = types?.filter(t => !t.is_active) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einsatztypen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
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
              <CardTitle>Einsatztypen</CardTitle>
              <CardDescription>
                Verwalten Sie die verfügbaren Einsatztypen. Deaktivierte Typen sind bei der Einsatzplanung nicht wählbar.
              </CardDescription>
            </div>
            {canManage && (
              <Button size="sm" className="gap-2" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Neuer Typ
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Types */}
          {activeTypes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Aktiv ({activeTypes.length})</h3>
              {activeTypes.map(type => (
                <TypeRow
                  key={type.id}
                  type={type}
                  canManage={canManage}
                  isToggling={togglingId === type.id}
                  onEdit={() => handleOpenEdit(type)}
                  onDelete={() => setDeleteConfirmId(type.id)}
                  onToggle={() => handleToggleActive(type)}
                />
              ))}
            </div>
          )}

          {/* Inactive Types */}
          {inactiveTypes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Deaktiviert ({inactiveTypes.length})</h3>
              {inactiveTypes.map(type => (
                <TypeRow
                  key={type.id}
                  type={type}
                  canManage={canManage}
                  isToggling={togglingId === type.id}
                  onEdit={() => handleOpenEdit(type)}
                  onDelete={() => setDeleteConfirmId(type.id)}
                  onToggle={() => handleToggleActive(type)}
                />
              ))}
            </div>
          )}

          {types && types.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              Keine Einsatztypen definiert. Standard-Typen werden beim Erstellen neuer Organisationen automatisch angelegt.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Einsatztyp bearbeiten" : "Neuer Einsatztyp"}
            </DialogTitle>
            <DialogDescription>
              {editingType 
                ? "Bearbeiten Sie die Details des Einsatztyps"
                : "Erstellen Sie einen neuen Einsatztyp für Ihre Organisation"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Bezeichnung *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="z.B. Grundpflege"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Code (optional)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="z.B. grundpflege"
              />
              <p className="text-xs text-muted-foreground">
                Wird automatisch aus der Bezeichnung generiert
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Farbe</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${option.class}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.label.trim() || createType.isPending || updateType.isPending}
            >
              {(createType.isPending || updateType.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingType ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einsatztyp löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Einsatztyp wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TypeRowProps {
  type: AssignmentType;
  canManage: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function TypeRow({ type, canManage, isToggling, onEdit, onDelete, onToggle }: TypeRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        !type.is_active && "opacity-60 bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-4 h-4 rounded-full",
            getColorClass(type.color),
            !type.is_active && "opacity-50"
          )}
        />
        <span className={cn("font-medium", !type.is_active && "text-muted-foreground")}>
          {type.label}
        </span>
        <Badge variant="outline" className="text-xs">
          {type.code}
        </Badge>
        {!type.is_active && (
          <Badge variant="secondary" className="text-xs">
            Deaktiviert
          </Badge>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {type.is_active ? "Aktiv" : "Inaktiv"}
            </span>
            <Switch
              checked={type.is_active}
              onCheckedChange={onToggle}
              disabled={isToggling}
              aria-label={`${type.label} ${type.is_active ? 'deaktivieren' : 'aktivieren'}`}
            />
          </div>
          <div className="flex items-center gap-1 border-l pl-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
