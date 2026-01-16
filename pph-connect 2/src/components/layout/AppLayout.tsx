import { ReactNode, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import {
  Home,
  Users,
  User,
  FolderOpen,
  Building2,
  UserCheck,
  Mail,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  ChevronsUpDown,
  CirclePlus,
  BarChart3,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AppLayoutProps {
  children: ReactNode
  pageTitle?: string
}

type NavigationItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
  requiredRoles?: UserRole[] // If specified, only these roles can see this item
}

type NavigationSection = {
  title: string
  items: NavigationItem[]
}

type QuickCreateAction = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// Helper to format role for display
const formatRoleLabel = (role: UserRole | undefined): string => {
  if (!role) return 'User'
  const labels: Record<UserRole, string> = {
    root: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    team_lead: 'Team Lead',
    worker: 'Worker',
  }
  return labels[role] || role
}

// Get badge variant based on role
const getRoleBadgeVariant = (role: UserRole | undefined): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!role) return 'outline'
  if (role === 'root') return 'destructive'
  if (role === 'admin') return 'default'
  return 'secondary'
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const { user, profile, signOut, isManagerOrAbove } = useAuth()
  const location = useLocation()

  const navigation: NavigationSection[] = useMemo(
    () => [
      {
        title: 'Home',
        items: [
          { title: 'Dashboard', href: '/dashboard', icon: Home },
          { title: 'Workers', href: '/workers', icon: Users, requiredRoles: ['root', 'admin', 'manager', 'team_lead'] },
          { title: 'Projects', href: '/projects', icon: FolderOpen, requiredRoles: ['root', 'admin', 'manager'] },
          { title: 'Teams', href: '/teams', icon: UserCheck, requiredRoles: ['root', 'admin', 'manager'] },
          { title: 'Departments', href: '/departments', icon: Building2, requiredRoles: ['root', 'admin'] },
          { title: 'Stats', href: '/stats', icon: BarChart3, requiredRoles: ['root', 'admin', 'manager', 'team_lead'] },
          { title: 'My Stats', href: '/my-stats', icon: BarChart3, requiredRoles: ['worker'] },
          { title: 'My Profile', href: '/my-profile', icon: User, requiredRoles: ['worker'] },
          { title: 'Rate Cards', href: '/rates', icon: CreditCard, requiredRoles: ['root', 'admin', 'manager'] },
          { title: 'User Management', href: '/users', icon: ShieldCheck, requiredRoles: ['root', 'admin'] },
          { title: 'Messages', href: '/messages', icon: Mail },
        ],
      },
    ],
    []
  )

  // Filter navigation items based on user role
  const filteredNavigation = useMemo(() => {
    const userRole = profile?.role
    return navigation.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If no role requirements, show to everyone
        if (!item.requiredRoles) return true
        // If user has no role yet, hide role-restricted items
        if (!userRole) return false
        // Check if user's role is in the required roles
        return item.requiredRoles.includes(userRole)
      }),
    }))
  }, [navigation, profile?.role])

  const quickCreateActions: QuickCreateAction[] = useMemo(
    () => [
      { title: 'Add Worker', href: '/workers/create', icon: Users },
      { title: 'Create Project', href: '/projects/create', icon: FolderOpen },
      { title: 'Create Team', href: '/teams/create', icon: UserCheck },
      { title: 'Import CSV', href: '/workers/bulk-upload', icon: CirclePlus },
    ],
    []
  )

  const bottomActions = [
    { title: 'Settings', icon: Settings, onClick: () => console.info('Settings coming soon'), comingSoon: true },
    { title: 'Get Help', icon: HelpCircle, onClick: () => console.info('Help coming soon'), comingSoon: true },
    { title: 'Search', icon: Search, onClick: () => console.info('Search coming soon'), comingSoon: true },
  ]

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex w-full">
        {/* Sidebar */}
        <div className="w-64 border-r bg-sidebar flex flex-col">
          {/* Logo/Header */}
          <div className="flex h-16 items-center gap-2 border-b px-3">
            <Link
              to="/dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <span className="text-lg font-bold">P</span>
            </Link>
            <Link to="/dashboard" className="flex items-center">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">PPH Connect</span>
                <span className="text-xs text-muted-foreground">Workforce Hub</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <nav className="space-y-1">
              {filteredNavigation.map((section, index) => (
                <div key={section.title} className={`space-y-1 ${index === 1 ? 'mt-8' : ''}`}>
                  <div className="px-2 py-1.5">
                    <h3 className="text-xs font-medium text-sidebar-foreground/60">{section.title}</h3>
                  </div>
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-md px-2 text-sm transition-colors ${
                        isActive(item.href)
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium py-2'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-1.5'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom Actions */}
          <div className="px-2 py-2">
            <div className="space-y-1">
              {bottomActions.map((action) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Profile Card */}
          <div className="border-t p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-left min-w-0">
                    <span className="text-sm font-medium text-sidebar-foreground truncate w-full">
                      {user?.email ? user.email.split('@')[0] : 'User'}
                    </span>
                    <span
                      className="text-xs text-sidebar-foreground/60 truncate w-full"
                      title={user?.email || 'email@example.com'}
                    >
                      {user?.email || 'email@example.com'}
                    </span>
                    <Badge variant={getRoleBadgeVariant(profile?.role)} className="mt-1 text-xs">
                      {formatRoleLabel(profile?.role)}
                    </Badge>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate w-full">
                      {user?.email ? user.email.split('@')[0] : 'User'}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground truncate w-full" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.info('Settings coming soon')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.info('Help coming soon')} className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pageTitle || 'Dashboard'}</h1>
              <Badge variant={getRoleBadgeVariant(profile?.role)} className="uppercase tracking-wide text-xs">
                {formatRoleLabel(profile?.role)}
              </Badge>
            </div>
            {isManagerOrAbove && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="gap-1.5">
                    <CirclePlus className="h-4 w-4" />
                    Quick Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {quickCreateActions.map((action) => (
                    <DropdownMenuItem asChild key={action.href}>
                      <Link to={action.href} className="flex items-center cursor-pointer gap-2">
                        <action.icon className="h-4 w-4" />
                        {action.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  )
}
