import React from "react";
import { AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RuleViolation } from "@/hooks/use-rule-violations";
import { cn } from "@/lib/utils";
import { ConflictResolutionPopover, ConflictContext, ConflictType } from "@/components/assignments/ConflictResolutionPopover";
import { Assignment } from "@/types";

interface RuleViolationBadgeProps {
  violations: RuleViolation[];
  compact?: boolean;
  assignment?: Assignment;
  onApplySolution?: (solution: { suggestedEmployeeId?: string; suggestedStartTime?: string; suggestedEndTime?: string }) => void;
}

// Map rule types to conflict types
function getConflictType(ruleType: string): ConflictType {
  switch (ruleType) {
    case 'availability':
      return 'availability';
    case 'time_overlap':
      return 'time_overlap';
    case 'required_qualification':
      return 'qualification';
    default:
      return 'availability';
  }
}

// Build conflict context from violation and assignment
function buildConflictContext(violation: RuleViolation, assignment?: Assignment): ConflictContext {
  return {
    type: getConflictType(violation.ruleType),
    employeeId: violation.employeeId,
    date: violation.date,
    startTime: assignment?.startTime || assignment?.preferredStartTime || '08:00',
    endTime: assignment?.endTime || assignment?.preferredEndTime || '09:00',
    assignmentType: assignment?.type,
    conflictDetails: violation.message,
    patientId: assignment?.patientId,
    patientName: assignment?.patientName,
  };
}

export function RuleViolationBadge({ violations, compact = false, assignment, onApplySolution }: RuleViolationBadgeProps) {
  if (violations.length === 0) return null;

  const hardViolations = violations.filter(v => v.category === "hard");
  const softViolations = violations.filter(v => v.category === "soft");
  const hasHard = hardViolations.length > 0;

  // Primary violation to show context for
  const primaryViolation = hasHard ? hardViolations[0] : softViolations[0];
  const conflictContext = buildConflictContext(primaryViolation, assignment);

  if (compact) {
    // Badge button component
    const BadgeButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
      (props, ref) => (
        <button
          ref={ref}
          type="button"
          className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-20",
            hasHard ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {hasHard ? (
            <XCircle className="h-3 w-3 text-white" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-white" />
          )}
        </button>
      )
    );
    BadgeButton.displayName = 'BadgeButton';

    if (onApplySolution) {
      // Use popover directly without tooltip to avoid click interference
      return (
        <ConflictResolutionPopover
          context={conflictContext}
          onApplySolution={onApplySolution}
        >
          <BadgeButton />
        </ConflictResolutionPopover>
      );
    }

    // Fallback without popover - show tooltip
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <BadgeButton />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {violations.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {v.category === "hard" ? (
                  <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                )}
                <span>{v.message}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {hardViolations.map((v, i) => (
        <Tooltip key={`hard-${i}`}>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-xs gap-1 cursor-help">
              <XCircle className="h-3 w-3" />
              {v.ruleName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{v.message}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {softViolations.map((v, i) => (
        <Tooltip key={`soft-${i}`}>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs gap-1 cursor-help bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
              <AlertTriangle className="h-3 w-3" />
              {v.ruleName}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{v.message}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

interface RuleViolationSummaryProps {
  hardCount: number;
  softCount: number;
}

export function RuleViolationSummary({ hardCount, softCount }: RuleViolationSummaryProps) {
  if (hardCount === 0 && softCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
      {hardCount > 0 && (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {hardCount} Fehler
        </Badge>
      )}
      {softCount > 0 && (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" />
          {softCount} Warnungen
        </Badge>
      )}
      <span className="text-sm text-muted-foreground ml-2">
        {hardCount > 0 
          ? "Bitte behebe die Regelverstösse vor dem Speichern"
          : "Warnungen können ignoriert werden"
        }
      </span>
    </div>
  );
}
