import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const Header: React.FC = () => {
  const { user, session, logout, isAdmin } = useAuth();

  const userEmail = user?.email ?? session?.user?.email ?? 'team@pphconnect.test';
  const normalizedRole = user?.role ?? (isAdmin ? 'admin' : null);
  const roleLabel = normalizedRole
    ? normalizedRole
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
    : 'Member';
  const roleVariant: 'default' | 'secondary' | 'outline' =
    normalizedRole && ['admin', 'root'].includes(normalizedRole) ? 'default' : 'outline';

  const handleConfirmLogout = () => {
    logout();
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex items-center gap-3">
        <Link
          to="/m/dashboard"
          className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground lg:flex"
          aria-label="Go to dashboard"
        >
          P
        </Link>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">PPH Connect</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={roleVariant} className="hidden sm:inline-flex" aria-label={`Signed in as ${roleLabel}`}>
          {roleLabel}
        </Badge>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <span className="sr-only">View notifications</span>
          <Bell className="h-4 w-4" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out</AlertDialogTitle>
              <AlertDialogDescription>
                You are signed in as <span className="font-medium">{userEmail}</span>. Logging out will end your current
                session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLogout}>Logout</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted sm:hidden">
          <User className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
    </header>
  );
};

export default Header;
