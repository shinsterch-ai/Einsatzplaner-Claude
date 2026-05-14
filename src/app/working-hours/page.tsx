'use client'

import { useState, useMemo } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useEmployees } from "@/hooks/use-employees";
import { useAssignments } from "@/hooks/use-assignments";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeVacations } from "@/hooks/use-employee-vacations";
import { useWorkingHoursAccount, getOvertimeColor, getVacationColor } from "@/hooks/use-working-hours-account";
import { WorkingHoursAccountCard } from "@/components/employees/WorkingHoursAccountCard";
import { VacationList } from "@/components/employees/VacationList";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

export default function WorkingHoursPage() {
  const { isOrgAdmin, isSuperadmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { employees, isLoading: employeesLoading, updateEmployee, updateVacationDaysTotal } = useEmployees();
  const { assignments, isLoading: assignmentsLoading } = useAssignments();
  const { vacations, createVacation, updateVacation, deleteVacation, getUsedVacationDays } = useEmployeeVacations();

  const isAdmin = isOrgAdmin || isSuperadmin;

  const employeeProfiles = useMemo(() => {
    return employees.map(emp => {
      const usedDays = getUsedVacationDays(emp.id);
      return {
        id: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        workPercentage: emp.workPercentage,
        weeklyHours: emp.weeklyHours,
        availability: emp.availability,
        isSick: emp.isSick,
        vacationDaysTotal: emp.vacationDaysTotal ?? 25,
        vacationDaysUsed: usedDays,
      };
    });
  }, [employees, getUsedVacationDays]);

  const workingHoursAccounts = useWorkingHoursAccount(employeeProfiles, assignments || [], currentDate);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return workingHoursAccounts;
    const term = searchTerm.toLowerCase();
    return workingHoursAccounts.filter(account => account.employeeName.toLowerCase().includes(term));
  }, [workingHoursAccounts, searchTerm]);

  const summary = useMemo(() => {
    const accounts = workingHoursAccounts;
    const totalEmployees = accounts.length;
    const totalViolations = accounts.filter(a => a.hasArgViolations).length;
    const totalOvertime = accounts.reduce((sum, a) => sum + (view === 'monthly' ? a.monthlyOvertime : a.yearlyOvertime), 0);
    const avgUtilization = accounts.length > 0
      ? Math.round(accounts.reduce((sum, a) => {
          const target = view === 'monthly' ? a.monthlyTargetHours : a.yearlyTargetHours;
          const actual = view === 'monthly' ? a.monthlyActualHours : a.yearlyActualHours;
          return sum + (target > 0 ? (actual / target) * 100 : 0);
        }, 0) / accounts.length)
      : 0;
    return { totalEmployees, totalViolations, totalOvertime, avgUtilization };
  }, [workingHoursAccounts, view]);

  const isLoading = employeesLoading || assignmentsLoading;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />Arbeitszeitkonto</h1>
            <p className="text-muted-foreground">Übersicht der Arbeitszeiten, Überstunden und Urlaub</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Heute</Button>
            <span className="font-medium min-w-[150px] text-center">{format(currentDate, view === 'monthly' ? 'MMMM yyyy' : 'yyyy', { locale: de })}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'monthly' | 'yearly')}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="monthly">Monatlich</TabsTrigger>
              <TabsTrigger value="yearly">Jährlich</TabsTrigger>
            </TabsList>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Input placeholder="Mitarbeiter suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64" />
              <Button variant={displayMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setDisplayMode('cards')}>Karten</Button>
              <Button variant={displayMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setDisplayMode('table')}>Tabelle</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Mitarbeiter</p><p className="text-2xl font-bold">{summary.totalEmployees}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Ø Auslastung</p><p className="text-2xl font-bold">{summary.avgUtilization}%</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", summary.totalOvertime > 0 ? "bg-amber-100" : "bg-green-100")}><Clock className={cn("h-5 w-5", summary.totalOvertime > 0 ? "text-amber-600" : "text-green-600")} /></div><div><p className="text-sm text-muted-foreground">Gesamt-Überstunden</p><p className={cn("text-2xl font-bold", getOvertimeColor(summary.totalOvertime))}>{summary.totalOvertime > 0 ? '+' : ''}{summary.totalOvertime.toFixed(1)}h</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", summary.totalViolations > 0 ? "bg-destructive/10" : "bg-green-100")}><AlertTriangle className={cn("h-5 w-5", summary.totalViolations > 0 ? "text-destructive" : "text-green-600")} /></div><div><p className="text-sm text-muted-foreground">ArG-Verstöße</p><p className={cn("text-2xl font-bold", summary.totalViolations > 0 ? "text-destructive" : "text-green-600")}>{summary.totalViolations}</p></div></div></CardContent></Card>
          </div>

          <TabsContent value="monthly" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Lade Daten...</div>
            ) : displayMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map(account => (
                  <div key={account.employeeId} onClick={() => setSelectedEmployeeId(account.employeeId)} className="cursor-pointer">
                    <WorkingHoursAccountCard account={account} view="monthly" />
                  </div>
                ))}
              </div>
            ) : (
              <WorkingHoursTable accounts={filteredAccounts} view="monthly" />
            )}
          </TabsContent>

          <TabsContent value="yearly" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Lade Daten...</div>
            ) : displayMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map(account => (
                  <div key={account.employeeId} onClick={() => setSelectedEmployeeId(account.employeeId)} className="cursor-pointer">
                    <WorkingHoursAccountCard account={account} view="yearly" />
                  </div>
                ))}
              </div>
            ) : (
              <WorkingHoursTable accounts={filteredAccounts} view="yearly" />
            )}
          </TabsContent>
        </Tabs>

        {filteredAccounts.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">Keine Mitarbeiter gefunden.</div>
        )}

        <Sheet open={!!selectedEmployeeId} onOpenChange={() => setSelectedEmployeeId(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{employees.find(e => e.id === selectedEmployeeId)?.fullName || 'Mitarbeiter'}</SheetTitle>
            </SheetHeader>
            {selectedEmployeeId && (
              <div className="mt-6">
                <VacationList
                  employeeId={selectedEmployeeId}
                  employeeName={employees.find(e => e.id === selectedEmployeeId)?.fullName || ''}
                  vacations={vacations.filter(v => v.employeeId === selectedEmployeeId)}
                  vacationDaysTotal={employees.find(e => e.id === selectedEmployeeId)?.vacationDaysTotal ?? 25}
                  vacationDaysUsed={getUsedVacationDays(selectedEmployeeId)}
                  onCreateVacation={async (data) => { await createVacation.mutateAsync({ employeeId: selectedEmployeeId, ...data }); }}
                  onUpdateVacation={async (id, data) => { await updateVacation.mutateAsync({ id, ...data }); }}
                  onDeleteVacation={async (id) => { await deleteVacation.mutateAsync(id); }}
                  onUpdateVacationDaysTotal={async (days) => { await updateVacationDaysTotal.mutateAsync({ employeeId: selectedEmployeeId, vacationDaysTotal: days }); }}
                  isAdmin={isAdmin}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

interface WorkingHoursTableProps {
  accounts: ReturnType<typeof useWorkingHoursAccount>;
  view: 'monthly' | 'yearly';
}

function WorkingHoursTable({ accounts, view }: WorkingHoursTableProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead className="text-right">Pensum</TableHead>
            <TableHead className="text-right">Soll</TableHead>
            <TableHead className="text-right">Ist</TableHead>
            <TableHead className="text-right">Differenz</TableHead>
            <TableHead className="text-right">Auslastung</TableHead>
            <TableHead className="text-right">Resturlaub</TableHead>
            <TableHead className="text-center">ArG</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map(account => {
            const targetHours = view === 'monthly' ? account.monthlyTargetHours : account.yearlyTargetHours;
            const actualHours = view === 'monthly' ? account.monthlyActualHours : account.yearlyActualHours;
            const overtime = view === 'monthly' ? account.monthlyOvertime : account.yearlyOvertime;
            const utilization = targetHours > 0 ? Math.round((actualHours / targetHours) * 100) : 0;
            return (
              <TableRow key={account.employeeId}>
                <TableCell className="font-medium">{account.employeeName}</TableCell>
                <TableCell className="text-right">{account.workPercentage}%</TableCell>
                <TableCell className="text-right">{targetHours}h</TableCell>
                <TableCell className="text-right">{actualHours}h</TableCell>
                <TableCell className={cn("text-right font-medium", getOvertimeColor(overtime))}>{overtime > 0 ? '+' : ''}{overtime}h</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Progress value={Math.min(utilization, 100)} className={cn("w-16 h-2", utilization > 100 && "[&>div]:bg-destructive")} />
                    <span className="w-10 text-right">{utilization}%</span>
                  </div>
                </TableCell>
                <TableCell className={cn("text-right", getVacationColor(account.vacationDaysRemaining, account.vacationDaysTotal))}>{account.vacationDaysRemaining}/{account.vacationDaysTotal}</TableCell>
                <TableCell className="text-center">
                  {account.hasArgViolations ? (
                    <Badge variant="destructive" className="text-xs">{account.argWarnings.filter(w => w.severity === 'error').length}</Badge>
                  ) : account.argWarnings.length > 0 ? (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">{account.argWarnings.length}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-500 text-xs">OK</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
