import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  User
} from "lucide-react";
import { 
  WorkingHoursAccount, 
  getOvertimeColor, 
  getVacationColor 
} from "@/hooks/use-working-hours-account";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WorkingHoursAccountCardProps {
  account: WorkingHoursAccount;
  view: 'monthly' | 'yearly';
}

export function WorkingHoursAccountCard({ account, view }: WorkingHoursAccountCardProps) {
  const isMonthly = view === 'monthly';
  
  const targetHours = isMonthly ? account.monthlyTargetHours : account.yearlyTargetHours;
  const workedHours = isMonthly ? account.monthlyWorkedHours : account.yearlyWorkedHours;
  const plannedHours = isMonthly ? account.monthlyPlannedHours : account.yearlyPlannedHours;
  const totalHours = isMonthly ? account.monthlyActualHours : account.yearlyActualHours;
  const overtime = isMonthly ? account.monthlyOvertime : account.yearlyOvertime;
  
  const utilizationPercent = targetHours > 0 
    ? Math.round((totalHours / targetHours) * 100) 
    : 0;
  
  const workedPercent = targetHours > 0 
    ? Math.round((workedHours / targetHours) * 100) 
    : 0;
  
  const errorWarnings = account.argWarnings.filter(w => w.severity === 'error');
  const warningWarnings = account.argWarnings.filter(w => w.severity === 'warning');

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      account.hasArgViolations && "border-destructive/50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-medium">
              {account.employeeName}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {account.workPercentage}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Hours Overview */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Soll</p>
            <p className="text-lg font-semibold">{targetHours}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gearbeitet</p>
            <p className="text-lg font-semibold text-green-600">{workedHours}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Geplant</p>
            <p className="text-lg font-semibold text-blue-600">{plannedHours}h</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Differenz</p>
            <p className={cn("text-lg font-semibold flex items-center justify-center gap-1", getOvertimeColor(overtime))}>
              {overtime > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : overtime < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
              {overtime > 0 ? '+' : ''}{overtime}h
            </p>
          </div>
        </div>
        
        {/* Progress Bar with worked/planned segments */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Auslastung ({workedHours}h gearbeitet + {plannedHours}h geplant)</span>
            <span>{utilizationPercent}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            {/* Worked hours (green) */}
            <div 
              className="absolute left-0 h-full bg-green-500 transition-all"
              style={{ width: `${Math.min(workedPercent, 100)}%` }}
            />
            {/* Planned hours (blue) - starts where worked ends */}
            <div 
              className={cn(
                "absolute h-full bg-blue-500 transition-all",
                utilizationPercent > 100 && "bg-amber-500"
              )}
              style={{ 
                left: `${Math.min(workedPercent, 100)}%`,
                width: `${Math.min(utilizationPercent - workedPercent, 100 - workedPercent)}%` 
              }}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Gearbeitet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Geplant</span>
            </div>
          </div>
        </div>
        
        {/* Vacation */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Resturlaub</span>
          </div>
          <span className={cn("font-medium", getVacationColor(account.vacationDaysRemaining, account.vacationDaysTotal))}>
            {account.vacationDaysRemaining} / {account.vacationDaysTotal} Tage
          </span>
        </div>
        
        {/* ArG Warnings */}
        {account.argWarnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">ArG-Hinweise</span>
            </div>
            
            <div className="space-y-1">
              {errorWarnings.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="cursor-help">
                      {errorWarnings.length} Verstöße
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <ul className="text-xs space-y-1">
                      {errorWarnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w.details}</li>
                      ))}
                      {errorWarnings.length > 3 && (
                        <li>...und {errorWarnings.length - 3} weitere</li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {warningWarnings.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-amber-500 text-amber-600 cursor-help ml-1">
                      {warningWarnings.length} Warnungen
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <ul className="text-xs space-y-1">
                      {warningWarnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w.details}</li>
                      ))}
                      {warningWarnings.length > 3 && (
                        <li>...und {warningWarnings.length - 3} weitere</li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
