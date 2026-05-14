'use client'

import { AppLayout } from '@/components/layout/AppLayout'

export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Benachrichtigungen</h1>
        <p className="text-muted-foreground mt-1">Ihre Benachrichtigungen</p>
      </div>
    </AppLayout>
  )
}