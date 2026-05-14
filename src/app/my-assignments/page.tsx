'use client'

import { useState, useMemo } from 'react';
import { format, isToday, addDays, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { mockAssignments } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Assignment } from '@/types';
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function MyAssignmentsPage() {
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const myAssignments = useMemo(() => {
    const employeeId = user?.role === 'employee' ? user.id : 'user-3';
    return mockAssignments.filter(a => a.assignedEmployeeId === employeeId);
  }, [user]);

  const today = startOfDay(new Date());
  const next7Days = addDays(today, 7);

  const todayAssignments = myAssignments
    .filter(a => isToday(new Date(a.date)))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingAssignments = myAssignments
    .filter(a => { const aDate = new Date(a.date); return aDate > today && aDate <= next7Days; })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedAssignments = myAssignments
    .filter(a => a.status === 'completed' || isBefore(new Date(a.date), today))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const groupByDate = (assignments: Assignment[]) => {
    const groups: Record<string, Assignment[]> = {};
    assignments.forEach(a => {
      const dateKey = format(new Date(a.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    });
    return groups;
  };

  const upcomingByDate = groupByDate(upcomingAssignments);

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Meine Einsätze</h1>
          <p className="text-muted-foreground mt-1">Übersicht deiner zugewiesenen Einsätze</p>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="today" className="gap-2"><Clock className="h-4 w-4" />Heute ({todayAssignments.length})</TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2"><Calendar className="h-4 w-4" />Kommende ({upcomingAssignments.length})</TabsTrigger>
            <TabsTrigger value="completed" className="gap-2"><CheckCircle className="h-4 w-4" />Erledigt</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <div className="space-y-4">
              {todayAssignments.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Keine Einsätze heute</p>
                  <p className="text-muted-foreground mt-1">Du hast heute keine Einsätze geplant.</p>
                </Card>
              ) : (
                todayAssignments.map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} onClick={() => { setSelectedAssignment(assignment); setSheetOpen(true); }} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="space-y-6">
              {Object.entries(upcomingByDate).length === 0 ? (
                <Card className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Keine kommenden Einsätze</p>
                  <p className="text-muted-foreground mt-1">Du hast keine Einsätze in den nächsten 7 Tagen.</p>
                </Card>
              ) : (
                Object.entries(upcomingByDate).map(([dateKey, assignments]) => (
                  <div key={dateKey}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{format(new Date(dateKey), 'EEEE, d. MMMM', { locale: de })}</h3>
                    <div className="space-y-3">
                      {assignments
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(assignment => (
                          <AssignmentCard key={assignment.id} assignment={assignment} onClick={() => { setSelectedAssignment(assignment); setSheetOpen(true); }} />
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {completedAssignments.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Noch keine erledigten Einsätze</p>
                </Card>
              ) : (
                completedAssignments.map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} onClick={() => { setSelectedAssignment(assignment); setSheetOpen(true); }} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <AssignmentDetailSheet assignment={selectedAssignment} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    </AppLayout>
  );
}
