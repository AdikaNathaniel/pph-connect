import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/contexts/AuthContext';
import Header from './Header';
import Sidebar, { SidebarMobile } from './Sidebar';
import SupportFooter from '@/components/support/SupportFooter';
import { Badge } from '@/components/ui/badge';

export interface MainLayoutProps {
  sidebar?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children, title }) => {
  const { isLoading, error, isAdmin } = useAuth();
  const user = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium text-destructive">We could not load your session.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {sidebar ? (
        <aside className="hidden lg:flex lg:w-72 lg:border-r lg:bg-muted/10">
          {sidebar}
        </aside>
      ) : (
        <Sidebar />
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
          <SidebarMobile />
          <Header />
        </div>
        <div className="hidden lg:block">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            {title ? (
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                Welcome back, {user?.full_name ?? 'team member'}
              </span>
            )}

            <Badge variant={isAdmin ? 'default' : 'outline'}>
              {isAdmin ? 'Admin access' : 'Standard access'}
            </Badge>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading content…
              </div>
            }
          >
            {children ?? <Outlet />}
          </Suspense>
        </main>
        <SupportFooter />
      </div>
    </div>
  );
};

export default MainLayout;
