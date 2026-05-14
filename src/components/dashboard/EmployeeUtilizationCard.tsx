import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Thermometer, Calendar, CalendarDays } from 'lucide-react';
import { EmployeeUtilization, getUtilizationColor, getUtilizationProgressClass } from '@/hooks/use-employee-utilization';

interface EmployeeUtilizationCardProps {
  utilizations: EmployeeUtilization[];
  title?: string;
  showExtendedView?: boolean;
}

export function EmployeeUtilizationCard({ 
  utilizations, 
  title = 'Mitarbeiter-Auslastung',
  showExtendedView = false
}: EmployeeUtilizationCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Sort by utilization descending
  const sorted = [...utilizations].sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  const sickCount = utilizations.filter(u => u.isSick).length;
  const avgUtilization = utilizations.length > 0 
    ? Math.round(utilizations.reduce((sum, u) => sum + u.utilizationPercent, 0) / utilizations.length)
    : 0;

  const renderEmployeeRow = (util: EmployeeUtilization, viewType: 'week' | 'month') => {
    const hours = viewType === 'week' ? util.scheduledHours : util.monthlyScheduledHours;
    const target = viewType === 'week' ? util.targetHours : util.monthlyTargetHours;
    const percent = viewType === 'week' ? util.utilizationPercent : util.monthlyUtilizationPercent;

    return (
      <div
        key={util.employeeId}
        className={`flex items-center gap-3 p-2 rounded-lg ${util.isSick ? 'bg-destructive/5 opacity-60' : 'hover:bg-muted/50'}`}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(util.employeeName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {util.employeeName}
            </span>
            {util.isSick && (
              <Thermometer className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            )}
            {showExtendedView && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {util.workPercentage}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress
              value={Math.min(percent, 100)}
              className={`h-1.5 flex-1 ${getUtilizationProgressClass(percent)}`}
            />
            <span className={`text-xs font-medium w-10 text-right ${getUtilizationColor(percent)}`}>
              {percent}%
            </span>
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <div>{hours}h</div>
          <div className="text-[10px]">von {target}h</div>
        </div>
      </div>
    );
  };

  const renderEmployeeList = (viewType: 'week' | 'month') => (
    <ScrollArea className="h-[280px] pr-4">
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Keine Mitarbeiter gefunden
          </p>
        ) : (
          sorted.map((util) => renderEmployeeRow(util, viewType))
        )}
      </div>
    </ScrollArea>
  );

  // Extended view with tabs for admin/planer
  if (showExtendedView) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {sickCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Thermometer className="h-3 w-3" />
                  {sickCount} krank
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="month" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="week" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Woche
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Monat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="week">
              {renderEmployeeList('week')}
            </TabsContent>
            <TabsContent value="month">
              {renderEmployeeList('month')}
            </TabsContent>
          </Tabs>
          
          {/* Summary section */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-muted-foreground">Wochensoll</div>
              <div className="font-semibold">{sorted[0]?.targetHours || 0}h</div>
            </div>
            <div>
              <div className="text-muted-foreground">Monatssoll</div>
              <div className="font-semibold">{sorted[0]?.monthlyTargetHours || 0}h</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jahressoll</div>
              <div className="font-semibold">{sorted[0]?.yearlyTargetHours || 0}h</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Simple view (default)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {sickCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Thermometer className="h-3 w-3" />
                {sickCount} krank
              </Badge>
            )}
            <Badge variant="secondary">
              Ø {avgUtilization}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderEmployeeList('week')}
      </CardContent>
    </Card>
  );
}
