'use client'

import { useState, useMemo } from 'react';
import { useDemoData } from '@/hooks/use-demo-data';
import { useAssignments } from '@/hooks/use-assignments';
import { Assignment, AssignmentStatus, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { AssignmentDetailSheet } from '@/components/assignments/AssignmentDetailSheet';
import { AssignmentFormDialog } from '@/components/assignments/AssignmentFormDialog';
import { SeriesEditDialog } from '@/components/assignments/SeriesEditDialog';
import { StatusBadge } from '@/components/assignments/StatusBadge';
import { TypeBadge } from '@/components/assignments/TypeBadge';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Search, Plus, Calendar, User, MapPin, Clock,
  Filter, X, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Repeat, Pencil
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from '@/components/layout/AppLayout';

type FilterStatus = 'all' | AssignmentStatus;
type FilterTimeframe = 'all' | 'today' | 'week' | 'past' | 'future';
type ViewTab = 'all' | 'recurring';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface SeriesGroup {
  seriesId: string;
  assignments: Assignment[];
  patientName: string;
  type: Assignment['type'];
  zone: string | null;
  recurrence: Assignment['recurrence'];
  startDate: string;
  endDate: string;
  recurrenceEndDate: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  preferredStartTime: string;
  preferredEndTime: string;
  durationMinutes: number;
  internalNote: string | null;
  count: number;
}

export default function AssignmentsPage() {
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const { useDemo, assignments: dataAssignments, isLoading: demoLoading } = useDemoData();
  const { deleteAssignment, deleteAssignmentSeries, updateAssignment, isLoading: dbLoading } = useAssignments();

  const isLoading = demoLoading || dbLoading;
  const canEdit = hasRole(['admin', 'planer', 'superadmin']);

  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<FilterTimeframe>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [seriesEditOpen, setSeriesEditOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesGroup | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);

  const today = startOfDay(new Date());

  const seriesGroups = useMemo(() => {
    const groups: Map<string, SeriesGroup> = new Map();
    const getDateString = (date: Date | string): string => typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

    dataAssignments.forEach((assignment) => {
      if (!assignment.seriesId) return;
      const dateStr = getDateString(assignment.date);
      const existing = groups.get(assignment.seriesId);

      if (existing) {
        existing.assignments.push(assignment);
        existing.count++;
        if (dateStr < existing.startDate) existing.startDate = dateStr;
        if (dateStr > existing.endDate) existing.endDate = dateStr;
      } else {
        groups.set(assignment.seriesId, {
          seriesId: assignment.seriesId,
          assignments: [assignment],
          patientName: assignment.patientName,
          type: assignment.type,
          zone: assignment.zone,
          recurrence: assignment.recurrence,
          startDate: dateStr,
          endDate: dateStr,
          recurrenceEndDate: assignment.recurrenceEndDate
            ? (typeof assignment.recurrenceEndDate === 'string' ? assignment.recurrenceEndDate : format(assignment.recurrenceEndDate, 'yyyy-MM-dd'))
            : null,
          assignedEmployeeId: assignment.assignedEmployeeId,
          assignedEmployeeName: assignment.assignedEmployeeName,
          preferredStartTime: assignment.preferredStartTime || assignment.startTime || '08:00',
          preferredEndTime: assignment.preferredEndTime || assignment.endTime || '09:00',
          durationMinutes: assignment.durationMinutes || 60,
          internalNote: assignment.internalNote || null,
          count: 1,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [dataAssignments]);

  const filteredAssignments = useMemo(() => {
    let result = [...dataAssignments];
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(a =>
        a.patientName.toLowerCase().includes(search) ||
        a.assignedEmployeeName?.toLowerCase().includes(search) ||
        a.zone?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (timeframeFilter !== 'all') {
      result = result.filter(a => {
        const date = typeof a.date === 'string' ? parseISO(a.date) : a.date;
        const dateStart = startOfDay(date);
        switch (timeframeFilter) {
          case 'today': return dateStart.getTime() === today.getTime();
          case 'week': { const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7); return !isBefore(dateStart, today) && isBefore(dateStart, weekEnd); }
          case 'past': return isBefore(dateStart, today);
          case 'future': return isAfter(dateStart, today);
          default: return true;
        }
      });
    }
    result.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      return dateB.localeCompare(dateA);
    });
    return result;
  }, [dataAssignments, searchTerm, statusFilter, timeframeFilter, today]);

  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + itemsPerPage);

  const allPageSelected = paginatedAssignments.length > 0 && paginatedAssignments.every(a => selectedIds.has(a.id));
  const somePageSelected = paginatedAssignments.some(a => selectedIds.has(a.id));
  const allFilteredSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const newSelected = new Set(selectedIds);
      paginatedAssignments.forEach(a => newSelected.delete(a.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedAssignments.forEach(a => newSelected.add(a.id));
      setSelectedIds(newSelected);
    }
  };

  const handleStatusChange = async (assignment: Assignment, newStatus: AssignmentStatus) => {
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, data: { status: newStatus === 'in-progress' ? 'in_progress' : newStatus as any } });
      toast.success('Status aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    try { await deleteAssignment.mutateAsync(assignment.id); } catch (error) {}
  };

  const handleDeleteSeries = async (seriesId: string) => {
    try { await deleteAssignmentSeries.mutateAsync(seriesId); } catch (error) {}
  };

  const confirmDelete = async () => {
    if (assignmentToDelete) {
      try {
        await deleteAssignment.mutateAsync(assignmentToDelete.id);
        toast.success('Einsatz gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
    setDeleteConfirmOpen(false);
    setAssignmentToDelete(null);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    let successCount = 0, errorCount = 0;
    for (const id of selectedIds) {
      try { await deleteAssignment.mutateAsync(id); successCount++; } catch { errorCount++; }
    }
    setIsDeleting(false);
    setBulkDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    if (errorCount === 0) toast.success(`${successCount} Einsätze gelöscht`);
    else toast.warning(`${successCount} gelöscht, ${errorCount} fehlgeschlagen`);
  };

  const getDateString = (date: Date | string) => {
    if (typeof date === 'string') return format(parseISO(date), 'EEE, d. MMM yyyy', { locale: de });
    return format(date, 'EEE, d. MMM yyyy', { locale: de });
  };

  const getRecurrenceLabel = (recurrence: Assignment['recurrence']) => {
    switch (recurrence) {
      case 'daily': return 'Täglich';
      case 'weekly': return 'Wöchentlich';
      default: return 'Einmalig';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Alle Einsätze</h1>
            <p className="text-muted-foreground mt-1">
              {filteredAssignments.length} von {dataAssignments.length} Einsätze
              {seriesGroups.length > 0 && ` • ${seriesGroups.length} Serien`}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" className="gap-2" onClick={() => { setEditingAssignment(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />Neuer Einsatz
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2"><Calendar className="h-4 w-4" />Alle Einsätze</TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2">
              <Repeat className="h-4 w-4" />Wiederkehrende Serien
              {seriesGroups.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{seriesGroups.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'all' && (
          <>
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Klient, Mitarbeiter oder Ort suchen..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as FilterStatus); setCurrentPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {(['draft', 'planned', 'confirmed', 'in-progress', 'completed', 'cancelled'] as AssignmentStatus[]).map(status => (
                    <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeframeFilter} onValueChange={(v) => { setTimeframeFilter(v as FilterTimeframe); setCurrentPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Zeitraum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Zeiträume</SelectItem>
                  <SelectItem value="today">Heute</SelectItem>
                  <SelectItem value="week">Nächste 7 Tage</SelectItem>
                  <SelectItem value="future">Zukünftig</SelectItem>
                  <SelectItem value="past">Vergangen</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || statusFilter !== 'all' || timeframeFilter !== 'all') && (
                <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTimeframeFilter('all'); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{selectedIds.size} ausgewählt</span>
                  {!allFilteredSelected && <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedIds(new Set(filteredAssignments.map(a => a.id)))}>Alle {filteredAssignments.length} auswählen</Button>}
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedIds(new Set())}>Auswahl aufheben</Button>
                </div>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setBulkDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" />{selectedIds.size} löschen
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === 'all' && (
          isMobile ? (
            <div className="space-y-3 overflow-auto flex-1">
              {paginatedAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Filter className="h-12 w-12 mb-4 opacity-50" /><p>Keine Einsätze gefunden</p>
                </div>
              ) : (
                paginatedAssignments.map(assignment => (
                  <Card key={assignment.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(assignment.id) ? 'ring-2 ring-primary' : ''}`} onClick={() => { setSelectedAssignment(assignment); setSheetOpen(true); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          {canEdit && <Checkbox checked={selectedIds.has(assignment.id)} onCheckedChange={() => { const s = new Set(selectedIds); s.has(assignment.id) ? s.delete(assignment.id) : s.add(assignment.id); setSelectedIds(s); }} onClick={(e) => e.stopPropagation()} className="mt-1" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{assignment.patientName}</span>
                              {assignment.seriesId && <Badge variant="outline" className="text-xs gap-1"><Repeat className="h-3 w-3" /></Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1"><TypeBadge type={assignment.type} /><StatusBadge status={assignment.status} /></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.priority === 'urgent' && <Badge variant="destructive" className="text-xs">Dringend</Badge>}
                          {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setAssignmentToDelete(assignment); setDeleteConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground ml-7">
                        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{getDateString(assignment.date)}</div>
                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{assignment.startTime} - {assignment.endTime}</div>
                        {assignment.assignedEmployeeName && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" />{assignment.assignedEmployeeName}</div>}
                        {assignment.zone && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{assignment.zone}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canEdit && <TableHead className="w-[50px]"><Checkbox checked={allPageSelected} ref={(el) => { if (el) (el as any).indeterminate = somePageSelected && !allPageSelected; }} onCheckedChange={toggleSelectAll} /></TableHead>}
                      <TableHead>Datum</TableHead>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Ort</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssignments.length === 0 ? (
                      <TableRow><TableCell colSpan={canEdit ? 10 : 7} className="text-center py-12 text-muted-foreground">Keine Einsätze gefunden</TableCell></TableRow>
                    ) : (
                      paginatedAssignments.map(assignment => (
                        <TableRow key={assignment.id} className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(assignment.id) ? 'bg-primary/5' : ''}`} onClick={() => { setSelectedAssignment(assignment); setSheetOpen(true); }}>
                          {canEdit && <TableCell><Checkbox checked={selectedIds.has(assignment.id)} onCheckedChange={() => { const s = new Set(selectedIds); s.has(assignment.id) ? s.delete(assignment.id) : s.add(assignment.id); setSelectedIds(s); }} onClick={(e) => e.stopPropagation()} /></TableCell>}
                          <TableCell className="font-medium">{getDateString(assignment.date)}</TableCell>
                          <TableCell>{assignment.startTime} - {assignment.endTime}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {assignment.patientName}
                              {assignment.priority === 'urgent' && <Badge variant="destructive" className="text-xs">!</Badge>}
                              {assignment.seriesId && <Badge variant="outline" className="text-xs gap-1" title="Wiederkehrend"><Repeat className="h-3 w-3" /></Badge>}
                            </div>
                          </TableCell>
                          <TableCell><TypeBadge type={assignment.type} /></TableCell>
                          <TableCell>{assignment.assignedEmployeeName || <span className="text-muted-foreground italic">Nicht zugewiesen</span>}</TableCell>
                          <TableCell>{assignment.zone || '-'}</TableCell>
                          <TableCell><StatusBadge status={assignment.status} /></TableCell>
                          {canEdit && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setAssignmentToDelete(assignment); setDeleteConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        )}

        {activeTab === 'recurring' && (
          <div className="space-y-3 overflow-auto flex-1">
            {seriesGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Repeat className="h-12 w-12 mb-4 opacity-50" /><p>Keine wiederkehrenden Serien vorhanden</p>
                <p className="text-sm mt-2">Erstellen Sie einen neuen Einsatz mit Wiederholung</p>
              </div>
            ) : (
              seriesGroups.map((series) => (
                <Card key={series.seriesId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{series.patientName}</span>
                          <TypeBadge type={series.type} />
                          <Badge variant="secondary" className="text-xs">{getRecurrenceLabel(series.recurrence)}</Badge>
                          <Badge variant="outline" className="text-xs">{series.count} Termine</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(parseISO(series.startDate), 'd. MMM', { locale: de })} - {format(parseISO(series.endDate), 'd. MMM yyyy', { locale: de })}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{series.preferredStartTime} - {series.preferredEndTime}</span>
                          {series.assignedEmployeeName && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{series.assignedEmployeeName}</span>}
                          {series.zone && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{series.zone}</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 ml-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSeries(series); setSeriesEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteSeriesId(series.seriesId)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'all' && filteredAssignments.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Zeige</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
              </Select>
              <span>von {filteredAssignments.length} Einsätzen</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-1 px-2"><span className="text-sm">Seite {currentPage} von {totalPages || 1}</span></div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Einsatz löschen?</AlertDialogTitle>
              <AlertDialogDescription>{assignmentToDelete && <>Möchten Sie den Einsatz für <strong>{assignmentToDelete.patientName}</strong> am {getDateString(assignmentToDelete.date)} wirklich löschen?</>}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedIds.size} Einsätze löschen?</AlertDialogTitle>
              <AlertDialogDescription>Möchten Sie wirklich <strong>{selectedIds.size} Einsätze</strong> löschen? Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Wird gelöscht...' : `${selectedIds.size} löschen`}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteSeriesId} onOpenChange={() => setDeleteSeriesId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Serie löschen?</AlertDialogTitle>
              <AlertDialogDescription>Möchten Sie wirklich alle Termine dieser wiederkehrenden Serie löschen?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { if (deleteSeriesId) { try { await deleteAssignmentSeries.mutateAsync(deleteSeriesId); setDeleteSeriesId(null); } catch {} } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Alle löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AssignmentDetailSheet assignment={selectedAssignment} open={sheetOpen} onOpenChange={setSheetOpen} onEdit={canEdit ? (a) => { setEditingAssignment(a); setSheetOpen(false); setFormOpen(true); } : undefined} onStatusChange={canEdit ? handleStatusChange : undefined} onDelete={canEdit ? handleDeleteAssignment : undefined} onDeleteSeries={canEdit ? handleDeleteSeries : undefined} />
        <AssignmentFormDialog open={formOpen} onOpenChange={setFormOpen} assignment={editingAssignment} onSave={() => setFormOpen(false)} />
        <SeriesEditDialog open={seriesEditOpen} onOpenChange={setSeriesEditOpen} series={editingSeries} onSaved={() => setEditingSeries(null)} />
      </div>
    </AppLayout>
  );
}
