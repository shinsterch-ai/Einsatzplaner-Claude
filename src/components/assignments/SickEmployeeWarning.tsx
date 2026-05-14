import { AlertCircle, Thermometer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SickEmployeeWarningProps {
  employeeName?: string;
  sickSince?: string | null;
  className?: string;
}

export function SickEmployeeWarning({ 
  employeeName, 
  sickSince,
  className 
}: SickEmployeeWarningProps) {
  if (!employeeName) return null;

  return (
    <Alert variant="destructive" className={className}>
      <Thermometer className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <span className="font-medium">{employeeName}</span> ist krankgemeldet
        {sickSince && <span className="text-xs opacity-80">(seit {sickSince})</span>}
        <span className="ml-1">– Zuweisung nicht empfohlen</span>
      </AlertDescription>
    </Alert>
  );
}
