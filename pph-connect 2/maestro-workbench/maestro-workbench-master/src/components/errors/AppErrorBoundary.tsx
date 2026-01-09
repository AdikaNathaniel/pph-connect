import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';

export const AppErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const normalized = normalizeError(error);
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        {toUserFacingMessage(normalized)}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={resetErrorBoundary}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
};

export const AppErrorBoundary: React.FC<React.PropsWithChildren<{ onReset?: () => void }>> = ({
  children,
  onReset
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, info) => {
        console.error('Unhandled application error', error, info);
        const normalized = normalizeError(error);
        toast.error('Something went wrong', {
          description: toUserFacingMessage(normalized)
        });
      }}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AppErrorBoundary;
