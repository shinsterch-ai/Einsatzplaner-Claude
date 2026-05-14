import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Thermometer, Calendar, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';

export interface SickLeaveData {
  isSick: boolean;
  sickSince: string | null;
  sickUntil: string | null;
  sickNote: string | null;
}

interface SickLeaveToggleProps {
  value: SickLeaveData;
  onChange: (data: SickLeaveData) => void;
  disabled?: boolean;
}

export function SickLeaveToggle({
  value,
  onChange,
  disabled = false,
}: SickLeaveToggleProps) {
  const [localSickSince, setLocalSickSince] = useState(value.sickSince || format(new Date(), 'yyyy-MM-dd'));
  const [localSickUntil, setLocalSickUntil] = useState(value.sickUntil || '');
  const [localSickNote, setLocalSickNote] = useState(value.sickNote || '');

  // Sync local state with props when value changes
  useEffect(() => {
    setLocalSickSince(value.sickSince || format(new Date(), 'yyyy-MM-dd'));
    setLocalSickUntil(value.sickUntil || '');
    setLocalSickNote(value.sickNote || '');
  }, [value.sickSince, value.sickUntil, value.sickNote]);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange({
        isSick: true,
        sickSince: localSickSince,
        sickUntil: localSickUntil || null,
        sickNote: localSickNote || null,
      });
    } else {
      onChange({
        isSick: false,
        sickSince: null,
        sickUntil: null,
        sickNote: null,
      });
    }
  };

  const handleFieldChange = (field: 'sickSince' | 'sickUntil' | 'sickNote', fieldValue: string) => {
    if (field === 'sickSince') {
      setLocalSickSince(fieldValue);
    } else if (field === 'sickUntil') {
      setLocalSickUntil(fieldValue);
    } else {
      setLocalSickNote(fieldValue);
    }
    
    // Only update parent if sick is enabled
    if (value.isSick) {
      onChange({
        isSick: true,
        sickSince: field === 'sickSince' ? fieldValue : localSickSince,
        sickUntil: field === 'sickUntil' ? (fieldValue || null) : (localSickUntil || null),
        sickNote: field === 'sickNote' ? (fieldValue || null) : (localSickNote || null),
      });
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${value.isSick ? 'bg-destructive/10' : 'bg-muted'}`}>
            <Thermometer className={`h-5 w-5 ${value.isSick ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Krankmeldung</Label>
            <p className="text-sm text-muted-foreground">
              {value.isSick ? 'Mitarbeiter ist aktuell krankgemeldet' : 'Mitarbeiter ist einsatzbereit'}
            </p>
          </div>
        </div>
        <Switch
          checked={value.isSick}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {value.isSick && (
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sickSince" className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                Krank seit *
              </Label>
              <Input
                id="sickSince"
                type="date"
                value={localSickSince}
                onChange={(e) => handleFieldChange('sickSince', e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sickUntil" className="flex items-center gap-2 text-sm">
                <CalendarCheck className="h-3.5 w-3.5" />
                Voraussichtlich bis
              </Label>
              <Input
                id="sickUntil"
                type="date"
                value={localSickUntil}
                onChange={(e) => handleFieldChange('sickUntil', e.target.value)}
                min={localSickSince}
                disabled={disabled}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sickNote" className="text-sm">
              Notiz (optional)
            </Label>
            <Textarea
              id="sickNote"
              placeholder="z.B. Grippe, Arztzeugnis liegt vor..."
              value={localSickNote}
              onChange={(e) => handleFieldChange('sickNote', e.target.value)}
              rows={2}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
