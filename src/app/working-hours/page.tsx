'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function WorkingHoursPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Arbeitszeitkonto</h1>
        <p className="text-muted-foreground mt-1">Zeiterfassung und Auswertung</p>
      </div>
    </AppLayout>
  )
}