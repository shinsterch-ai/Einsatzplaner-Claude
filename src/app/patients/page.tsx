'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientFormDialog, PatientFormData } from '@/components/patients/PatientFormDialog';
import { PatientAssignmentsSheet } from '@/components/patients/PatientAssignmentsSheet';
import { AssignmentFormDialog } from '@/components/assignments/AssignmentFormDialog';
import { AISuggestions } from '@/components/assignments/AISuggestions';
import { usePatients, DbPatient } from '@/hooks/use-patients';
import { useAssignments, CreateAssignmentData, DbAssignment } from '@/hooks/use-assignments';
import { useAutoAssign, autoAssignSilent } from '@/hooks/use-auto-assign';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { mockPatients } from '@/data/mockData';
import { demoPatients } from '@/data/demoOrgData';
import { Patient, Assignment } from '@/types';
import { Plus, Search, Edit, Trash2, MapPin, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';

export default function PatientsPage() {
  const { isSuperadmin } = useAuth();
  const { isDemoMode } = useDemoMode();
  const isDemo = isSuperadmin && isDemoMode;

  const {
    patients: dbPatients,
    isLoading: patientsLoading,
    createPatient,
    updatePatient,
    deletePatient
  } = usePatients();

  const { createAssignment } = useAssignments();
  const { isAssigning } = useAutoAssign();

  const [demoPatientsList, setDemoPatientsList] = useState<Patient[]>(
    isDemo ? demoPatients : mockPatients
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<DbPatient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<DbPatient | null>(null);
  const [aiSuggestionsPatient, setAiSuggestionsPatient] = useState<DbPatient | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentsSheetPatient, setAssignmentsSheetPatient] = useState<DbPatient | null>(null);

  const patients = isDemo ? demoPatientsList : dbPatients;
  const isLoading = !isDemo && patientsLoading;

  const filteredPatients = patients.filter(
    (patient) =>
      (patient.full_name && patient.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.city && patient.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.notes && patient.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddPatient = () => {
    setEditingPatient(null);
    setFormOpen(true);
  };

  const handleEditPatient = (patient: DbPatient | Patient) => {
    if (isDemo) {
      const demoPatient = patient as Patient;
      setEditingPatient({
        id: demoPatient.id,
        organization_id: 'demo-org',
        full_name: demoPatient.full_name || '',
        phone: demoPatient.phone || null,
        city: demoPatient.city || null,
        address: demoPatient.address || null,
        notes: demoPatient.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      setEditingPatient(patient as DbPatient);
    }
    setFormOpen(true);
  };

  const handleDeleteClick = (patient: DbPatient | Patient) => {
    if (isDemo) {
      const demoPatient = patient as Patient;
      setPatientToDelete({
        id: demoPatient.id,
        organization_id: 'demo-org',
        full_name: demoPatient.full_name || '',
        phone: demoPatient.phone || null,
        city: demoPatient.city || null,
        address: demoPatient.address || null,
        notes: demoPatient.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      setPatientToDelete(patient as DbPatient);
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    if (isDemo) {
      setDemoPatientsList((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      toast.success(`Klient ${patientToDelete.full_name} wurde gelöscht`);
    } else {
      try {
        await deletePatient.mutateAsync(patientToDelete.id);
        toast.success(`Klient ${patientToDelete.full_name} wurde gelöscht`);
      } catch (error) {}
    }

    setPatientToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleSavePatient = async (data: PatientFormData) => {
    if (isDemo) {
      if (editingPatient) {
        setDemoPatientsList((prev) =>
          prev.map((p) =>
            p.id === editingPatient.id
              ? { ...p, full_name: data.full_name, phone: data.phone, city: data.city, address: data.address, notes: data.notes }
              : p
          )
        );
        toast.success(`Klient ${data.full_name} wurde aktualisiert`);
      } else {
        const newPatient: Patient = {
          id: `pat-${Date.now()}`,
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
          address: data.address,
          notes: data.notes,
        };
        setDemoPatientsList((prev) => [...prev, newPatient]);
        toast.success(`Klient ${data.full_name} wurde erstellt`);
      }
      return;
    }

    try {
      if (editingPatient) {
        await updatePatient.mutateAsync({
          id: editingPatient.id,
          data: { full_name: data.full_name, phone: data.phone, city: data.city, address: data.address, notes: data.notes },
        });
        toast.success(`Klient ${data.full_name} wurde aktualisiert`);
      } else {
        await createPatient.mutateAsync({ full_name: data.full_name, phone: data.phone, city: data.city, address: data.address, notes: data.notes });
        toast.success(`Klient ${data.full_name} wurde erstellt`);
      }
    } catch (error) {}
  };

  const handleEditAssignment = (dbAssignment: DbAssignment) => {
    const assignment: Assignment = {
      id: dbAssignment.id,
      date: dbAssignment.date,
      startTime: dbAssignment.start_time || dbAssignment.preferred_start_time,
      endTime: dbAssignment.end_time || dbAssignment.preferred_end_time,
      preferredStartTime: dbAssignment.preferred_start_time,
      preferredEndTime: dbAssignment.preferred_end_time,
      durationMinutes: dbAssignment.duration_minutes,
      patientName: dbAssignment.patient?.full_name || '',
      patientId: dbAssignment.patient_id,
      patientAddress: dbAssignment.patient?.address || undefined,
      type: dbAssignment.type as any,
      zone: dbAssignment.zone || '',
      zoneId: '',
      assignedEmployeeId: dbAssignment.assigned_employee_id || undefined,
      assignedEmployeeName: dbAssignment.assigned_employee?.full_name || undefined,
      status: dbAssignment.status.replace('_', '-') as any,
      internalNote: dbAssignment.internal_note || undefined,
      employeeNote: dbAssignment.employee_note || undefined,
      priority: dbAssignment.priority as any,
      seriesId: dbAssignment.series_id || undefined,
      recurrence: dbAssignment.recurrence as any,
      recurrenceEndDate: dbAssignment.recurrence_end_date ? new Date(dbAssignment.recurrence_end_date) : undefined,
      createdAt: new Date(dbAssignment.created_at),
      updatedAt: new Date(dbAssignment.updated_at),
    };
    setEditingAssignment(assignment);
    setAssignmentDialogOpen(true);
  };

  const isMutating = createPatient.isPending || updatePatient.isPending || createAssignment.isPending || isAssigning;

  return (
    <AppLayout>
      <div className="p-4 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Klienten</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Verwalten Sie alle Klienten im System
            </p>
          </div>
          <Button onClick={handleAddPatient} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Neuer Klient
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Klientenliste</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keine Klienten gefunden</p>
            ) : (
              <>
                <div className="md:hidden divide-y">
                  {filteredPatients.map((patient) => (
                    <div key={patient.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="font-medium cursor-pointer hover:text-primary" onClick={() => setAssignmentsSheetPatient(isDemo ? { id: patient.id, organization_id: 'demo-org', full_name: patient.full_name || '', phone: patient.phone || null, city: patient.city || null, address: patient.address || null, notes: patient.notes || null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as DbPatient : patient as DbPatient)}>
                          {patient.full_name || '(Ohne Name)'}
                        </div>
                        <div className="flex items-center gap-1">
                          {!isDemo && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAiSuggestionsPatient(patient as DbPatient)} title="KI-Einsatzvorschläge"><Sparkles className="h-4 w-4 text-primary" /></Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPatient(patient)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(patient)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {'phone' in patient && patient.phone && <span>{patient.phone}</span>}
                        {patient.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{patient.city}</span>}
                      </div>
                      {patient.notes && <p className="text-sm text-muted-foreground truncate"><FileText className="h-3 w-3 inline mr-1" />{patient.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Ort</TableHead>
                        <TableHead>Notizen</TableHead>
                        <TableHead className="w-24">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium cursor-pointer hover:text-primary hover:underline" onClick={() => setAssignmentsSheetPatient(isDemo ? { id: patient.id, organization_id: 'demo-org', full_name: patient.full_name || '', phone: patient.phone || null, city: patient.city || null, address: patient.address || null, notes: patient.notes || null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as DbPatient : patient as DbPatient)}>
                            {patient.full_name || '(Ohne Name)'}
                          </TableCell>
                          <TableCell>{'phone' in patient && patient.phone ? patient.phone : '—'}</TableCell>
                          <TableCell>{patient.city ? <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{patient.city}</div> : '—'}</TableCell>
                          <TableCell>{patient.notes ? <div className="flex items-center gap-1.5 text-sm"><FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate max-w-xs">{patient.notes}</span></div> : '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!isDemo && <Button variant="ghost" size="icon" onClick={() => setAiSuggestionsPatient(patient as DbPatient)} title="KI-Einsatzvorschläge"><Sparkles className="h-4 w-4 text-primary" /></Button>}
                              <Button variant="ghost" size="icon" onClick={() => handleEditPatient(patient)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(patient)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <PatientFormDialog open={formOpen} onOpenChange={setFormOpen} patient={editingPatient} onSave={handleSavePatient} isLoading={isMutating} onEditAssignment={handleEditAssignment} />

        <AssignmentFormDialog open={assignmentDialogOpen} onOpenChange={(open) => { setAssignmentDialogOpen(open); if (!open) setEditingAssignment(null); }} assignment={editingAssignment} onSave={() => { setAssignmentDialogOpen(false); setEditingAssignment(null); }} />

        <PatientAssignmentsSheet patient={assignmentsSheetPatient} open={assignmentsSheetPatient !== null} onOpenChange={(open) => !open && setAssignmentsSheetPatient(null)} />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Klient löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie den Klient <strong>{patientToDelete?.full_name}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deletePatient.isPending}>
                {deletePatient.isPending ? 'Löschen...' : 'Löschen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={aiSuggestionsPatient !== null} onOpenChange={(open) => !open && setAiSuggestionsPatient(null)}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {aiSuggestionsPatient && (
              <AISuggestions patient={aiSuggestionsPatient} onCreateAssignment={async (data) => { await createAssignment.mutateAsync(data); }} onClose={() => setAiSuggestionsPatient(null)} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
