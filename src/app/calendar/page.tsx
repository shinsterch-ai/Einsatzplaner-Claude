'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function CalendarPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Wochenplan</h1>
        <p className="text-muted-foreground mt-1">Wöchentliche Einsatzplanung</p>
      </div>
    </AppLayout>
  )
}