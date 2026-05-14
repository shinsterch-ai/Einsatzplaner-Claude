import { AlertTriangle, Award, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ASSIGNMENT_TYPES } from '@/hooks/use-employee-qualifications';
import { Database } from '@/lib/supabase/types';

type AssignmentTypeEnum = Database['public']['Enums']['assignment_type'];

interface QualificationWarningProps {
  employeeId: string | undefined;
  employeeName: string | undefined;
  assignmentType: AssignmentTypeEnum | undefined;
  employeeQualifications: AssignmentTypeEnum[] | undefined;
}

export function QualificationWarning({
  employeeId,
  employeeName,
  assignmentType,
  employeeQualifications,
}: QualificationWarningProps) {
  // No warning needed if no employee selected or no assignment type
  if (!employeeId || !assignmentType) {
    return null;
  }

  const isQualified = employeeQualifications?.includes(assignmentType) ?? false;
  const typeLabel = ASSIGNMENT_TYPES.find(t => t.value === assignmentType)?.label || assignmentType;

  if (isQualified) {
    return null; // No warning if qualified
  }

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <strong>{employeeName}</strong> ist nicht für <strong>{typeLabel}</strong> qualifiziert.
        {employeeQualifications && employeeQualifications.length > 0 ? (
          <span className="block mt-1 text-sm">
            Qualifiziert für: {employeeQualifications.map(q => 
              ASSIGNMENT_TYPES.find(t => t.value === q)?.label
            ).join(', ')}
          </span>
        ) : (
          <span className="block mt-1 text-sm">Keine Qualifikationen hinterlegt.</span>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Helper component to show qualification badges in select items
interface EmployeeQualificationBadgesProps {
  qualifications: AssignmentTypeEnum[] | undefined;
  assignmentType: AssignmentTypeEnum | undefined;
  compact?: boolean;
}

export function EmployeeQualificationBadges({
  qualifications,
  assignmentType,
  compact = true,
}: EmployeeQualificationBadgesProps) {
  if (!qualifications || qualifications.length === 0) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground ml-2">
        Keine Qual.
      </Badge>
    );
  }

  const isQualifiedForType = assignmentType ? qualifications.includes(assignmentType) : true;
  
  if (compact) {
    // Show qualified status indicator
    if (assignmentType) {
      return isQualifiedForType ? (
        <Badge variant="secondary" className="text-xs ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <Check className="h-3 w-3 mr-0.5" />
          Qual.
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs ml-2 border-amber-500 text-amber-600">
          <AlertTriangle className="h-3 w-3 mr-0.5" />
          Nicht qual.
        </Badge>
      );
    }
    
    // Show count when no type selected
    if (qualifications.length === ASSIGNMENT_TYPES.length) {
      return (
        <Badge variant="secondary" className="text-xs ml-2">
          Alle
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-xs ml-2">
        {qualifications.length} Qual.
      </Badge>
    );
  }

  // Full badges view
  return (
    <div className="flex flex-wrap gap-1 ml-2">
      {qualifications.slice(0, 3).map(q => {
        const type = ASSIGNMENT_TYPES.find(t => t.value === q);
        return (
          <Badge 
            key={q} 
            variant="outline" 
            className={`text-xs ${q === assignmentType ? 'bg-green-100 border-green-500 text-green-700' : ''}`}
          >
            {type?.label.slice(0, 3)}
          </Badge>
        );
      })}
      {qualifications.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{qualifications.length - 3}
        </Badge>
      )}
    </div>
  );
}
