import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { hasRole, type UserRole } from '@/lib/auth/roles';

type AllowedRole = UserRole;

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AllowedRole;
  loadingFallback?: React.ReactNode;
  unauthenticatedRedirect?: string;
  passwordChangeRedirect?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  loadingFallback = <div>Loading...</div>,
  unauthenticatedRedirect = '/auth',
  passwordChangeRedirect = '/change-password'
}) => {
  const { isLoading, isAuthenticated, error, isAdmin } = useAuth();
  const user = useUser();
  const location = useLocation();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={unauthenticatedRedirect} state={{ from: location }} replace />;
  }

  if (error) {
    return (
      <div role="alert" className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  const needsPasswordChange = !!user.initial_password_hash && !user.password_changed_at;
  if (needsPasswordChange && location.pathname !== passwordChangeRedirect) {
    return <Navigate to={passwordChangeRedirect} replace />;
  }

  if (requiredRole) {
    const isAuthorized = hasRole(user.role, requiredRole);
    if (!isAuthorized) {
      const fallback = hasRole(user.role, 'manager') ? '/m/dashboard' : '/w/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  return (
    <>
      <Badge
        variant={isAdmin ? 'default' : 'outline'}
        className="pointer-events-none fixed bottom-4 right-4 shadow"
        data-testid="protected-route-badge"
      >
        {isAdmin ? 'Admin access' : 'Standard access'}
      </Badge>
      {children}
    </>
  );
};
