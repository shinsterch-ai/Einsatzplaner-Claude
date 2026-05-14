import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { User } from '@/types';
import { ASSIGNMENT_TYPES } from '@/hooks/use-employee-qualifications';
import { Database } from '@/lib/supabase/types';
import { Award, Percent, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { DayAvailability, getDefaultAvailability } from './AvailabilitySchedule';
import { AvailabilitySchedule } from './AvailabilitySchedule';

type AssignmentType = Database['public']['Enums']['assignment_type'];

export interface EmployeeFormDataWithQualifications {
  name: string;
  email: string;
  workPercentage: number;
  isActive: boolean;
  qualifications: AssignmentType[];
  availability: DayAvailability[];
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User | null;
  onSave: (data: EmployeeFormDataWithQualifications) => void;
  initialQualifications?: AssignmentType[];
  initialAvailability?: DayAvailability[];
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSave,
  initialQualifications = [],
  initialAvailability = [],
}: EmployeeFormDialogProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Name & Email
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2: Qualifications
  const [selectedQualifications, setSelectedQualifications] = useState<AssignmentType[]>([]);

  // Step 3: Work percentage & Availability
  const [workPercentage, setWorkPercentage] = useState(100);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setStep(1);
      if (employee) {
        setName(employee.name);
        setEmail(employee.email);
        setIsActive(employee.isActive);
        setWorkPercentage((employee as any).workPercentage ?? 100);
        setSelectedQualifications(initialQualifications);
        setAvailability(initialAvailability.length > 0 ? initialAvailability : getDefaultAvailability());
      } else {
        setName('');
        setEmail('');
        setIsActive(true);
        setWorkPercentage(100);
        setSelectedQualifications(ASSIGNMENT_TYPES.map(t => t.value));
        setAvailability(getDefaultAvailability());
      }
      setNameError('');
      setEmailError('');
    }
  }, [employee, open, initialQualifications, initialAvailability]);

  const validateStep1 = () => {
    let valid = true;
    setNameError('');
    setEmailError('');

    if (!name.trim()) {
      setNameError('Name ist erforderlich');
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('E-Mail ist erforderlich');
      valid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Ungültige E-Mail-Adresse');
      valid = false;
    }

    return valid;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
    }
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleQualificationToggle = (type: AssignmentType) => {
    setSelectedQualifications(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = () => {
    onSave({
      name: name.trim(),
      email: email.trim(),
      workPercentage,
      isActive,
      qualifications: selectedQualifications,
      availability,
    });
    onOpenChange(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Schritt 1: Grunddaten';
      case 2: return 'Schritt 2: Qualifikationen';
      case 3: return 'Schritt 3: Anstellung & Verfügbarkeit';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()} ({step}/{totalSteps})
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Name & Email */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Vor- und Nachname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                {nameError && (
                  <p className="text-sm font-medium text-destructive">{nameError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@beispiel.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailError && (
                  <p className="text-sm font-medium text-destructive">{emailError}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Qualifications */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">Qualifikationen</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Für welche Einsatzarten ist dieser Mitarbeiter qualifiziert?
              </p>
              <div className="grid grid-cols-1 gap-2 rounded-lg border p-4">
                {ASSIGNMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2"
                  >
                    <Checkbox
                      checked={selectedQualifications.includes(type.value)}
                      onCheckedChange={() => handleQualificationToggle(type.value)}
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
              {selectedQualifications.length === 0 && (
                <p className="text-xs text-amber-600">
                  ⚠️ Keine Qualifikation ausgewählt – Mitarbeiter kann keinem Einsatz zugewiesen werden
                </p>
              )}
            </div>
          )}

          {/* Step 3: Work Percentage & Availability */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Work Percentage */}
              <div className="space-y-2">
                <Label htmlFor="workPercentage" className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  Anstellungsprozent *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="workPercentage"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="100"
                    className="w-24"
                    value={workPercentage}
                    onChange={(e) => setWorkPercentage(parseInt(e.target.value) || 100)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              {/* Availability */}
              <AvailabilitySchedule value={availability} onChange={setAvailability} />

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Aktiv</Label>
                  <p className="text-sm text-muted-foreground">
                    Mitarbeiter kann Einsätze sehen
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between gap-2 pt-4 border-t mt-4">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            {step < totalSteps ? (
              <Button type="button" onClick={handleNext}>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-1" />
                {employee ? 'Speichern' : 'Hinzufügen'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Re-export for backwards compatibility
export type EmployeeFormValues = {
  name: string;
  email: string;
  workPercentage: number;
  isActive: boolean;
};
