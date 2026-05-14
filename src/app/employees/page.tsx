'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function EmployeesPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Mitarbeiter</h1>
        <p className="text-muted-foreground mt-1">Mitarbeiterverwaltung</p>
      </div>
    </AppLayout>
  )
}