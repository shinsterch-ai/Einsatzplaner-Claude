'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function MyAssignmentsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Meine Einsätze</h1>
        <p className="text-muted-foreground mt-1">Ihre zugewiesenen Einsätze</p>
      </div>
    </AppLayout>
  )
}