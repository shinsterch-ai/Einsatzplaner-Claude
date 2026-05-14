import { useState } from 'react';
import { Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SickLeaveToggle, SickLeaveData } from './SickLeaveToggle';
import { SickReassignmentDialog } from './SickReassignmentDialog';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Assignment } from '@/types';
import { UserWithQualifications } from '@/hooks/use-demo-data';

interface ScheduleSuggestion {
  assignmentId: string;
  suggestedEmployeeId: string;
  suggestedEmployeeName: string;
}

interface SickLeavePopoverProps {
  employeeId: string;
  employeeName: string;
  isSick: boolean;
  sickSince: string | null;
  sickUntil: string | null;
  sickNote: string | null;
  onSave: (data: SickLeaveData) => Promise<void>;
  onReassignSuggestions?: (suggestions: ScheduleSuggestion[]) => Promise<void>;
  disabled?: boolean;
  useDemo?: boolean;
  demoAssignments?: Assignment[];
  demoEmployees?: UserWithQualifications[];
}

export function SickLeavePopover({
  employeeId,
  employeeName,
  isSick,
  sickSince,
  sickUntil,
  sickNote,
  onSave,
  onReassignSuggestions,
  disabled,
  useDemo = false,
  demoAssignments = [],
  demoEmployees = [],
}: SickLeavePopoverProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReassignment, setShowReassignment] = useState(false);
  const [localData, setLocalData] = useState<SickLeaveData>({
    isSick,
    sickSince,
    sickUntil,
    sickNote,
  });

  // Reset local data when popover opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalData({
        isSick,
        sickSince,
        sickUntil,
        sickNote,
      });
    }
    setOpen(newOpen);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localData);
      setOpen(false);
      // If newly marked as sick and reassignment handler exists, show reassignment dialog
      if (localData.isSick && !isSick && onReassignSuggestions) {
        setShowReassignment(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReassign = async (suggestions: ScheduleSuggestion[]) => {
    if (onReassignSuggestions) {
      await onReassignSuggestions(suggestions);
    }
  };

  const getTooltipText = () => {
    if (!isSick) return 'Nicht krank';
    let text = 'Krankgemeldet';
    if (sickSince) {
      try {
        text += ` seit ${format(parseISO(sickSince), 'd. MMM', { locale: de })}`;
      } catch {
        // Invalid date
      }
    }
    if (sickUntil) {
      try {
        text += ` (bis ${format(parseISO(sickUntil), 'd. MMM', { locale: de })})`;
      } catch {
        // Invalid date
      }
    }
    return text;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  'relative',
                  isSick && 'text-destructive hover:text-destructive'
                )}
              >
                <Thermometer className="h-4 w-4" />
                {isSick && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="font-medium text-sm border-b pb-2">
            Krankmeldung – {employeeName}
          </div>
          <SickLeaveToggle
            value={localData}
            onChange={setLocalData}
            disabled={isSaving}
          />
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </PopoverContent>
      
      {/* Reassignment Dialog */}
      {onReassignSuggestions && (
        <SickReassignmentDialog
          open={showReassignment}
          onOpenChange={setShowReassignment}
          employeeId={employeeId}
          employeeName={employeeName}
          sickUntil={localData.sickUntil}
          onApplySuggestions={handleReassign}
          useDemo={useDemo}
          demoAssignments={demoAssignments}
          demoEmployees={demoEmployees}
        />
      )}
    </Popover>
  );
}