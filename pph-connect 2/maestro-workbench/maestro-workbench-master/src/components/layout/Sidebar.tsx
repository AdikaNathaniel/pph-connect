import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Users,
  FolderOpen,
  UserCheck,
  Building2,
  Settings,
  HelpCircle,
  Search,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  comingSoon?: boolean;
};

const primaryNav: NavItem[] = [
  { title: 'Dashboard', href: '/m/dashboard', icon: Home },
  { title: 'Workers', href: '/m/workers', icon: Users },
  { title: 'Projects', href: '/m/projects', icon: FolderOpen },
  { title: 'Teams', href: '/m/teams', icon: UserCheck },
  { title: 'Departments', href: '/m/departments', icon: Building2 }
];

const secondaryNav: NavItem[] = [
  { title: 'Settings', href: '#settings', icon: Settings, comingSoon: true },
  { title: 'Help', href: '#help', icon: HelpCircle, comingSoon: true },
  { title: 'Search', href: '#search', icon: Search, comingSoon: true }
];

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

interface SidebarLinkProps {
  item: NavItem;
  active: boolean;
  onComingSoon: (label: string) => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, active, onComingSoon }) => {
  const Icon = item.icon;

  const Element = (
    <span
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.title}</span>
      {item.badge && (
        <Badge variant="secondary" className="ml-auto">
          {item.badge}
        </Badge>
      )}
      {item.comingSoon && (
        <Badge variant="outline" className="ml-auto text-xs uppercase tracking-wide">
          Soon
        </Badge>
      )}
    </span>
  );

  if (item.comingSoon) {
    return (
      <button type="button" onClick={() => onComingSoon(item.title)} className="w-full text-left">
        {Element}
      </button>
    );
  }

  return (
    <Link
      to={item.href}
      className="block w-full"
      aria-current={active ? 'page' : undefined}
    >
      {Element}
    </Link>
  );
};

const SidebarContent: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const handleComingSoon = (label: string) => {
    console.info(`${label} is coming soon`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Link
          to="/m/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold"
        >
          P
        </Link>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold leading-tight">PPH Connect</span>
          <span className="text-xs text-muted-foreground">
            {isAdmin ? 'Admin overview' : 'Manager workspace'}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-4">
          <Collapsible defaultOpen className="space-y-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground">
              <span>Overview</span>
              <ChevronDown className="h-3 w-3 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {primaryNav.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isActive(location.pathname, item.href)}
                  onComingSoon={handleComingSoon}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen className="space-y-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground">
              <span>Utilities</span>
              <ChevronDown className="h-3 w-3 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {secondaryNav.map((item) => (
                <SidebarLink
                  key={item.title}
                  item={item}
                  active={false}
                  onComingSoon={handleComingSoon}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </ScrollArea>

      <div className="border-t p-3 text-xs text-muted-foreground">
        © {new Date().getFullYear()} PPH Connect. All rights reserved.
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => (
  <div className="hidden h-full w-64 border-r bg-muted/10 lg:flex">
    <SidebarContent />
  </div>
);

export const SidebarMobile: React.FC = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="lg:hidden">
        <span className="sr-only">Toggle navigation</span>
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5h14V4H3v1zm0 6h14v-1H3v1zm0 6h14v-1H3v1z" clipRule="evenodd" />
        </svg>
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="p-0">
      <SidebarContent />
    </SheetContent>
  </Sheet>
);

export default Sidebar;
