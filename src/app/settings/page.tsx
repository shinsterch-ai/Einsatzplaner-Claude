'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">Organisationseinstellungen</p>
      </div>
    </AppLayout>
  )
}