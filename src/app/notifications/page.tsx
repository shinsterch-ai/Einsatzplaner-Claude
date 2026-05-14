'use client'

import { mockNotifications } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';

const notificationIcons = {
  assignment_new: Calendar,
  assignment_changed: AlertCircle,
  assignment_cancelled: XCircle,
};

const notificationColors = {
  assignment_new: 'text-primary bg-primary/10',
  assignment_changed: 'text-accent bg-accent/10',
  assignment_cancelled: 'text-destructive bg-destructive/10',
};

export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Benachrichtigungen</h1>
            <p className="text-muted-foreground mt-1">Ihre Benachrichtigungen und Updates</p>
          </div>
          <Button variant="outline" size="sm">Alle als gelesen markieren</Button>
        </div>

        <div className="space-y-3">
          {mockNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Keine Benachrichtigungen</p>
              <p className="text-muted-foreground mt-1">Sie haben keine neuen Benachrichtigungen.</p>
            </Card>
          ) : (
            mockNotifications.map(notification => {
              const Icon = notificationIcons[notification.type];
              const iconColors = notificationColors[notification.type];
              return (
                <Card key={notification.id} className={cn('p-4 cursor-pointer card-interactive', !notification.isRead && 'border-l-4 border-l-primary')}>
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-full', iconColors)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={cn('font-medium', !notification.isRead && 'font-semibold')}>{notification.title}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: de })}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    {!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
