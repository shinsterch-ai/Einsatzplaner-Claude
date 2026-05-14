'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function AssignmentsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Alle Einsätze</h1>
        <p className="text-muted-foreground mt-1">Einsatzverwaltung</p>
      </div>
    </AppLayout>
  )
}