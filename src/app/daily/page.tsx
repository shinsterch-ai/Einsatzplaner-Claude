'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function DailyPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Tagesliste</h1>
        <p className="text-muted-foreground mt-1">Tagesübersicht der Einsätze</p>
      </div>
    </AppLayout>
  )
}