'use client'

import {
  Calendar, Users, ClipboardList, Settings, Home, Bell, LogOut,
  User as UserIcon, UserRound, ChevronDown, CalendarDays,
  Building2, Flame, Activity, ListTodo, Clock
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoMode } from '@/contexts/DemoModeContext'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface AppSidebarProps {
  onNavigate?: () => void
}

const navigation = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Wochenplan', href: '/calendar', icon: Calendar },
    { name: 'Alle Einsätze', href: '/assignments', icon: ListTodo },
    { name: 'Tagesliste', href: '/daily', icon: ClipboardList },
    { name: 'Arbeitszeitkonto', href: '/working-hours', icon: Clock },
    { name: 'Klienten', href: '/patients', icon: UserRound },
    { name: 'Mitarbeiter', href: '/employees', icon: Users },
    { name: 'Benutzer', href: '/users', icon: UserIcon },
    { name: 'Einstellungen', href: '/settings', icon: Settings },
  ],
  planer: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Wochenplan', href: '/calendar', icon: Calendar },
    { name: 'Alle Einsätze', href: '/assignments', icon: ListTodo },
    { name: 'Tagesliste', href: '/daily', icon: ClipboardList },
    { name: 'Arbeitszeitkonto', href: '/working-hours', icon: Clock },
    { name: 'Klienten', href: '/patients', icon: UserRound },
    { name: 'Mitarbeiter', href: '/employees', icon: Users },
  ],
  mitarbeiter: [
    { name: 'Meine Einsätze', href: '/my-assignments', icon: ClipboardList },
    { name: 'Wochenplan', href: '/calendar', icon: Calendar },
  ],
  superadmin_platform: [
    { name: 'Organisationen', href: '/superadmin/organizations', icon: Building2 },
    { name: 'Beispieleinsatzplan', href: '/superadmin/demo-schedule', icon: CalendarDays },
    { name: 'System-Status', href: '/admin/system-health', icon: Activity },
  ],
  superadmin_demo: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Wochenplan', href: '/calendar', icon: Calendar },
    { name: 'Alle Einsätze', href: '/assignments', icon: ListTodo },
    { name: 'Tagesliste', href: '/daily', icon: ClipboardList },
    { name: 'Arbeitszeitkonto', href: '/working-hours', icon: Clock },
    { name: 'Klienten', href: '/patients', icon: UserRound },
    { name: 'Mitarbeiter', href: '/employees', icon: Users },
    { name: 'Benutzer', href: '/users', icon: UserIcon },
    { name: 'Einstellungen', href: '/settings', icon: Settings },
  ],
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { user, profile, organization, logout, hasRole, isSuperadmin, isLoading } = useAuth()
  const { isDemoMode, toggleDemoMode, demoOrgName } = useDemoMode()
  const pathname = usePathname()
  const router = useRouter()

  if (!user || isLoading) return null

  const navItems = isSuperadmin
    ? isDemoMode ? navigation.superadmin_demo : navigation.superadmin_platform
    : hasRole(['admin']) ? navigation.admin
    : hasRole(['planer']) ? navigation.planer
    : navigation.mitarbeiter

  const roleLabel: Record<string, string> = {
    superadmin: 'Superadmin', admin: 'Administrator',
    planer: 'Einsatzplaner', mitarbeiter: 'Mitarbeiter:in',
  }
  const currentRole = isSuperadmin ? 'superadmin' : hasRole(['admin']) ? 'admin' : hasRole(['planer']) ? 'planer' : 'mitarbeiter'
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()
  const displayOrgName = isDemoMode ? demoOrgName : organization?.name || 'Einsatzplaner'
  const orgInitial = isDemoMode ? 'H' : organization?.code?.[0] || organization?.name?.[0] || 'E'

  const handleDemoToggle = () => {
    toggleDemoMode()
    router.push(isDemoMode ? '/superadmin/organizations' : '/dashboard')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden', isDemoMode ? 'bg-orange-500' : !organization?.logo_url && 'bg-sidebar-primary')}>
          {isDemoMode ? <Flame className="h-5 w-5 text-white" />
            : organization?.logo_url ? <img src={organization.logo_url} alt={displayOrgName} className="w-full h-full object-cover" />
            : <span className="text-lg font-bold text-sidebar-primary-foreground">{orgInitial}</span>}
        </div>
        <div>
          <h1 className="text-sm font-semibold">{displayOrgName}</h1>
          <p className="text-xs text-sidebar-foreground/60">{isDemoMode ? 'Demo-Organisation' : 'Einsatzplanung'}</p>
        </div>
      </div>

      {isSuperadmin && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={cn('h-4 w-4', isDemoMode ? 'text-orange-500' : 'text-sidebar-foreground/60')} />
              <span className="text-sm font-medium">Demo-Modus</span>
            </div>
            <Switch checked={isDemoMode} onCheckedChange={handleDemoToggle} className="data-[state=checked]:bg-orange-500" />
          </div>
          {isDemoMode && <p className="text-xs text-orange-500 mt-1">Demo aktiv</p>}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href} onClick={onNavigate}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? isDemoMode ? 'bg-orange-500/20 text-orange-500' : 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Link href="/notifications" onClick={onNavigate}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <div className="flex items-center gap-3"><Bell className="h-5 w-5" />Benachrichtigungen</div>
          <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground">2</Badge>
        </Link>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/50">
              <Avatar className="h-9 w-9">
                <AvatarFallback className={cn('text-sm', isDemoMode ? 'bg-orange-500 text-white' : 'bg-sidebar-primary text-sidebar-primary-foreground')}>
                  {getInitials(profile?.full_name ?? user.email ?? '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{profile?.full_name ?? user.email}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{isDemoMode ? 'Demo-Admin' : roleLabel[currentRole]}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem><UserIcon className="mr-2 h-4 w-4" />Profil</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Abmelden</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
