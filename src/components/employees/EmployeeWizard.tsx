import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ASSIGNMENT_TYPES } from '@/hooks/use-employee-qualifications';
import { Database } from '@/lib/supabase/types';
import { Award, Percent, ChevronLeft, ChevronRight, Check, X, Clock, UserCog } from 'lucide-react';
import { DayAvailability, getDefaultAvailability } from './AvailabilitySchedule';
import { AvailabilitySchedule } from './AvailabilitySchedule';
import { SickLeaveToggle, SickLeaveData } from './SickLeaveToggle';
import { calculateWeeklyHours, calculateAvailableHoursFromSchedule } from '@/hooks/use-employees';
import { useWorktimeSettings } from '@/hooks/use-worktime-settings';

type AssignmentType = Database['public']['Enums']['assignment_type'];
type EmployeeRole = 'mitarbeiter' | 'planer';

export interface EmployeeWizardData {
  name: string;
  email: string;
  phone?: string | null;
  password?: string;
  role: EmployeeRole;
  workPercentage: number;
  isActive: boolean;
  qualifications: AssignmentType[];
  availability: DayAvailability[];
  sickLeave: SickLeaveData;
}

interface EmployeeWizardProps {
  onSave: (data: EmployeeWizardData) => void;
  onCancel: () => void;
  initialData?: Partial<EmployeeWizardData>;
  isEditing?: boolean;
  isSaving?: boolean;
}

export function EmployeeWizard({ onSave, onCancel, initialData, isEditing = false, isSaving = false }: EmployeeWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Name, Email, Phone, Password, Role
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<EmployeeRole>(initialData?.role || 'mitarbeiter');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Step 2: Qualifications
  const [selectedQualifications, setSelectedQualifications] = useState<AssignmentType[]>(
    initialData?.qualifications || ASSIGNMENT_TYPES.map(t => t.value)
  );

  // Step 3: Work percentage & Availability
  const [workPercentage, setWorkPercentage] = useState(initialData?.workPercentage ?? 100);
  const [availability, setAvailability] = useState<DayAvailability[]>(
    initialData?.availability || getDefaultAvailability()
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sickLeave, setSickLeave] = useState<SickLeaveData>(
    initialData?.sickLeave || {
      isSick: false,
      sickSince: null,
      sickUntil: null,
      sickNote: null,
    }
  );

  // Calculate hours based on work percentage and org's configured base
  const { data: worktimeSettings } = useWorktimeSettings();
  const baseWeeklyHours = worktimeSettings?.weekly_hours_base ?? 40;
  const maxWeeklyHours = calculateWeeklyHours(workPercentage, baseWeeklyHours);
  const maxMonthlyHours = Math.round(maxWeeklyHours * 4.33 * 10) / 10; // Average weeks per month
  const maxYearlyHours = Math.round(maxWeeklyHours * 52);
  const availableHours = calculateAvailableHoursFromSchedule(availability);
  const utilizationPercent = availableHours > 0 ? Math.min(100, Math.round((maxWeeklyHours / availableHours) * 100)) : 0;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setPassword('');
      setRole(initialData.role || 'mitarbeiter');
      setSelectedQualifications(initialData.qualifications || ASSIGNMENT_TYPES.map(t => t.value));
      setWorkPercentage(initialData.workPercentage ?? 100);
      setAvailability(initialData.availability || getDefaultAvailability());
      setIsActive(initialData.isActive ?? true);
      setSickLeave(initialData.sickLeave || {
        isSick: false,
        sickSince: null,
        sickUntil: null,
        sickNote: null,
      });
    }
  }, [initialData]);

  const validateStep1 = () => {
    let valid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');

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

    // Phone is optional but validate format if provided
    if (phone && phone.length > 30) {
      setPhoneError('Telefonnummer zu lang');
      valid = false;
    }

    // Password required for new employees only
    if (!isEditing && !password) {
      setPasswordError('Passwort ist erforderlich');
      valid = false;
    } else if (!isEditing && password.length < 6) {
      setPasswordError('Passwort muss mindestens 6 Zeichen haben');
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
      phone: phone.trim() || null,
      password: password || undefined,
      role,
      workPercentage,
      isActive,
      qualifications: selectedQualifications,
      availability,
      sickLeave,
    });
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Grunddaten';
      case 2: return 'Qualifikationen';
      case 3: return 'Anstellung & Verfügbarkeit';
      default: return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEditing ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</CardTitle>
              <CardDescription>
                Schritt {step} von {totalSteps}: {getStepTitle()}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} disabled={isSaving}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Name, Email, Phone, Password */}
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

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+41 79 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {phoneError && (
                  <p className="text-sm font-medium text-destructive">{phoneError}</p>
                )}
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {passwordError && (
                    <p className="text-sm font-medium text-destructive">{passwordError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Das Passwort wird für den Login des Mitarbeiters verwendet
                  </p>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Rolle</Label>
                </div>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as EmployeeRole)}
                  className="grid grid-cols-2 gap-4"
                >
                  <label
                    htmlFor="role-mitarbeiter"
                    className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition-colors ${
                      role === 'mitarbeiter' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value="mitarbeiter" id="role-mitarbeiter" className="mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-medium">Mitarbeiter:in</span>
                      <p className="text-xs text-muted-foreground">
                        Kann eigene Einsätze einsehen
                      </p>
                    </div>
                  </label>
                  <label
                    htmlFor="role-planer"
                    className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition-colors ${
                      role === 'planer' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value="planer" id="role-planer" className="mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-medium">Planer:in</span>
                      <p className="text-xs text-muted-foreground">
                        Kann Einsätze planen und verwalten
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Qualifications */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <Label className="text-base font-medium">Qualifikationen</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Für welche Einsatzarten ist dieser Mitarbeiter qualifiziert?
              </p>
              <div className="grid grid-cols-1 gap-3 rounded-lg border p-4">
                {ASSIGNMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2"
                  >
                    <Checkbox
                      checked={selectedQualifications.includes(type.value)}
                      onCheckedChange={() => handleQualificationToggle(type.value)}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
              {selectedQualifications.length === 0 && (
                <p className="text-sm text-amber-600">
                  ⚠️ Keine Qualifikation ausgewählt – Mitarbeiter kann keinem Einsatz zugewiesen werden
                </p>
              )}
            </div>
          )}

          {/* Step 3: Work Percentage & Availability */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Work Percentage */}
              <div className="space-y-3">
                <Label htmlFor="workPercentage" className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  Anstellungsprozent
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="workPercentage"
                    type="number"
                    min={1}
                    max={100}
                    className="w-24"
                    value={workPercentage}
                    onChange={(e) => setWorkPercentage(parseInt(e.target.value) || 100)}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    = {maxWeeklyHours} Std./Woche
                  </span>
                </div>
              </div>

              {/* Availability */}
              <AvailabilitySchedule 
                value={availability} 
                onChange={setAvailability}
              />

              {/* Hours Summary */}
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label className="text-base font-medium">Kapazitätsübersicht</Label>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs">Wochensoll</span>
                    <span className="font-semibold text-base">{maxWeeklyHours} Std.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs">Monatssoll</span>
                    <span className="font-semibold text-base">{maxMonthlyHours} Std.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block text-xs">Jahressoll</span>
                    <span className="font-semibold text-base">{maxYearlyHours} Std.</span>
                  </div>
                </div>
                <div className="pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Verfügbare Stunden:</span>
                  <span className="font-medium ml-2">{availableHours.toFixed(1)} Std./Woche</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Auslastung der Verfügbarkeit:</span>
                    <span className={`font-medium ${utilizationPercent > 100 ? 'text-destructive' : utilizationPercent > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                      {utilizationPercent}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(utilizationPercent, 100)} 
                    className={`h-2 ${utilizationPercent > 100 ? '[&>div]:bg-destructive' : utilizationPercent > 80 ? '[&>div]:bg-amber-500' : ''}`}
                  />
                  {utilizationPercent > 100 && (
                    <p className="text-xs text-destructive">
                      ⚠️ Verfügbarkeit reicht nicht für die Soll-Stunden
                    </p>
                  )}
                </div>
              </div>

              {/* Sick Leave - only show when editing */}
              {isEditing && (
                <SickLeaveToggle
                  value={sickLeave}
                  onChange={setSickLeave}
                />
              )}

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

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
                Abbrechen
              </Button>
              {step < totalSteps ? (
                <Button type="button" onClick={handleNext}>
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                  <Check className="h-4 w-4 mr-1" />
                  {isSaving ? 'Speichern...' : (isEditing ? 'Speichern' : 'Hinzufügen')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
