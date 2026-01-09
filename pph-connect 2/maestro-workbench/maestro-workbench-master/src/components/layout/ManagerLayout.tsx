import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Home,
  BarChart3,
  FolderOpen,
  Users,
  UserCheck,
  Plug,
  CirclePlus, // Changed from Plus to CirclePlus
  Database,
  FileBarChart,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  ChevronsUpDown,
  BookOpen,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VersionTracker from '@/components/VersionTracker';
import SupportFooter from '@/components/support/SupportFooter';
import { hasRole, type UserRole } from '@/lib/auth/roles';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface ManagerLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
}

type NavigationItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  badge?: number | string;
  minRole?: UserRole;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

type QuickCreateAction = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole: UserRole;
};

const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children, pageTitle, breadcrumbs }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { unreadCount } = useMessageNotifications();

  const navigation: NavigationSection[] = useMemo(() => [
    {
      title: 'Home',
      items: [
        { title: 'Dashboard', href: '/m/dashboard', icon: Home, minRole: 'team_lead' },
        { title: 'Analytics', href: '/m/analytics', icon: BarChart3, minRole: 'team_lead' },
        { title: 'Quality', href: '/m/quality', icon: ShieldCheck, minRole: 'manager' },
        { title: 'Projects', href: '/m/projects', icon: FolderOpen, minRole: 'team_lead' },
        { title: 'Teams', href: '/m/teams', icon: Users, minRole: 'team_lead' },
        { title: 'Departments', href: '/m/departments', icon: FolderOpen, minRole: 'manager' },
        { title: 'User Management', href: '/users', icon: Users, minRole: 'admin' },
        { title: 'Project Assignments', href: '/m/assignments', icon: UserCheck, minRole: 'manager' },
        {
          title: 'Messages',
          href: '/m/messages/inbox',
          icon: Mail,
          badge: unreadCount > 0 ? unreadCount : undefined,
          minRole: 'team_lead',
        },
        { title: 'Manage Plugins', href: '/m/plugins', icon: Plug, minRole: 'admin' },
      ],
    },
    {
      title: 'Documents',
      items: [
        { title: 'Training Modules', href: '/m/training-modules', icon: BookOpen, minRole: 'team_lead' },
        { title: 'Knowledge Base', href: '/m/knowledge-base', icon: BookOpen, minRole: 'manager' },
        { title: 'Data Library', href: '/m/data-library', icon: Database, comingSoon: true, minRole: 'admin' },
        { title: 'Reports', href: '/m/reports', icon: FileBarChart, comingSoon: true, minRole: 'manager' },
        { title: 'Client Console Logs', href: '/m/client-logs', icon: Database, minRole: 'manager' },
      ],
    },
  ];
  }, [unreadCount]);

  const quickCreateActions: QuickCreateAction[] = useMemo(
    () => [
      { title: 'Create New Project', href: '/m/projects/new', icon: FolderOpen, minRole: 'manager' },
      { title: 'Manage Users', href: '/m/users', icon: Users, minRole: 'admin' },
      { title: 'Manage Assignments', href: '/m/assignments', icon: UserCheck, minRole: 'manager' },
      { title: 'View Plugins', href: '/m/plugins', icon: Plug, minRole: 'admin' },
    ],
    []
  );

  const allowedQuickCreateActions = useMemo(
    () => quickCreateActions.filter((action) => hasRole(user?.role ?? null, action.minRole)),
    [quickCreateActions, user?.role]
  );

  const bottomActions = [
    { title: 'Settings', icon: Settings, onClick: () => handleComingSoon('Settings'), comingSoon: true },
    { title: 'Get Help', icon: HelpCircle, onClick: () => handleComingSoon('Get Help'), comingSoon: true },
    { title: 'Search', icon: Search, onClick: () => handleComingSoon('Search'), comingSoon: true },
  ];

  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} Coming Soon`, {
      description: "This feature is currently in development and will be released soon.",
    });
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredNavigation = useMemo(() => {
    const currentRole = user?.role ?? null;
    return navigation
      .map((section) => ({
        title: section.title,
        items: section.items.filter((item) => !item.minRole || hasRole(currentRole, item.minRole)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navigation, user?.role]);

  const roleLabel = (user?.role ?? 'worker').replace('_', ' ');
  const isQuickCreateDisabled = allowedQuickCreateActions.length === 0;

  return (
    <div className="flex h-screen bg-background">
      <div className="flex w-full">
        {/* Sidebar */}
        <div className="w-64 border-r bg-sidebar flex flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center gap-2 border-b px-3">
          <Link to="/m/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors">
            <span className="text-lg font-bold">M</span>
          </Link>
          <Link to="/m/dashboard" className="flex items-center">
            <span className="font-semibold">PPH Maestro</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <nav className="space-y-1">
            {filteredNavigation.map((section, index) => (
              <div key={section.title} className={`space-y-1 ${index === 1 ? 'mt-8' : ''}`}>
                <div className="px-2 py-1.5">
                  <h3 className="text-xs font-medium text-sidebar-foreground/60">
                    {section.title}
                  </h3>
                </div>
                {section.items.map((item: any) => (
                  <Link
                    key={item.href}
                    to={item.comingSoon ? '#' : item.href}
                    onClick={item.comingSoon ? () => handleComingSoon(item.title) : undefined}
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
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col items-start text-left min-w-0">
                  <span className="text-sm font-medium text-sidebar-foreground truncate w-full">
                    {user?.full_name || 'User'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60 truncate w-full" title={user?.email || 'email@example.com'}>
                    {user?.email || 'email@example.com'}
                  </span>
                  <Badge variant="outline" data-testid="manager-layout-role-badge" className="mt-1">
                    {roleLabel}
                  </Badge>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate w-full">{user?.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground truncate w-full" title={user?.email}>
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleComingSoon('Account Settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleComingSoon('Support')} className="cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">
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
        <header className="flex h-16 items-center justify-between border-b px-6 rounded-t-[calc(var(--radius)+4px)]">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{pageTitle || 'Dashboard'}</h1>
            <Badge
              variant="secondary"
              data-testid="manager-layout-header-role-badge"
              className="uppercase tracking-wide"
            >
              {roleLabel}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 px-3 has-[>svg]:px-2.5 h-7 hidden sm:flex disabled:opacity-50"
                disabled={isQuickCreateDisabled}
                title={isQuickCreateDisabled ? 'Insufficient permissions for quick actions' : undefined}
              >
                  <CirclePlus className="h-4 w-4 shrink-0" />
                Quick Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {allowedQuickCreateActions.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-sm">
                  No quick actions available
                </DropdownMenuItem>
              ) : (
                allowedQuickCreateActions.map((action) => (
                  <DropdownMenuItem asChild key={action.href}>
                    <Link to={action.href} className="flex items-center cursor-pointer gap-2">
                      <action.icon className="h-4 w-4" />
                      {action.title}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const content = crumb.href && !crumb.current && !isLast ? (
                  <Link
                    to={crumb.href}
                    className="font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={crumb.current || isLast ? 'font-medium text-foreground' : ''}>
                    {crumb.label}
                  </span>
                );
                return (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    {content}
                    {!isLast ? <span className="text-muted-foreground/60">/</span> : null}
                  </React.Fragment>
                );
              })}
            </nav>
          ) : null}
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-background px-6 py-3">
          <div className="flex justify-end">
            <VersionTracker />
          </div>
        </footer>
        <SupportFooter />
        </div>
      </div>
    </div>
  );
};

export default ManagerLayout;
