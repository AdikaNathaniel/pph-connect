import React from 'react';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import type { ProtectedRouteProps } from '../ProtectedRoute';

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isAdmin: boolean;
  logout: () => void;
  refreshSession: () => Promise<void> | void;
};

let mockAuthState: AuthState;
let mockUser: any;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
  useUser: () => mockUser,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/secure', state: {} }),
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to}>
        {to}
      </div>
    ),
  };
});

const renderRoute = (props?: Partial<ProtectedRouteProps>) => {
  return render(
    <ProtectedRoute {...props}>
      <div>Secure Content</div>
    </ProtectedRoute>,
  );
};

beforeEach(() => {
  mockAuthState = {
    isLoading: false,
    isAuthenticated: true,
    error: null,
    isAdmin: false,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  };
  mockUser = {
    role: 'worker',
    initial_password_hash: null,
    password_changed_at: '2024-01-01T00:00:00',
  };
});

describe('ProtectedRoute', () => {
  it('shows loading fallback while auth state resolves', () => {
    mockAuthState.isLoading = true;
    mockAuthState.isAuthenticated = false;
    mockUser = null;

    renderRoute();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects unauthenticated visitors to /auth', () => {
    mockAuthState.isAuthenticated = false;
    mockUser = null;

    renderRoute();
    expect(screen.getByTestId('navigate')).toHaveTextContent('/auth');
  });

  it('forces password change when required', () => {
    mockUser = {
      role: 'worker',
      initial_password_hash: 'hash',
      password_changed_at: null,
    };

    renderRoute();
    expect(screen.getByTestId('navigate')).toHaveTextContent('/change-password');
  });

  it('redirects to fallback when user lacks required role', () => {
    mockUser.role = 'worker';

    renderRoute({ requiredRole: 'manager' });
    expect(screen.getByTestId('navigate')).toHaveTextContent('/w/dashboard');
  });

  it('renders children and access badge when authorized', () => {
    renderRoute();
    expect(screen.getByText('Secure Content')).toBeInTheDocument();
    expect(screen.getByTestId('protected-route-badge')).toBeInTheDocument();
  });
});
