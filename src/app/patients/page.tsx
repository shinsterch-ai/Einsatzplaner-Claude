'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function PatientsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Klienten</h1>
        <p className="text-muted-foreground mt-1">Klientenverwaltung</p>
      </div>
    </AppLayout>
  )
}