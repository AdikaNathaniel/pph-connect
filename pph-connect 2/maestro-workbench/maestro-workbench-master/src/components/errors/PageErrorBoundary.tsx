import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';

export const PageErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const normalized = normalizeError(error);
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm">
      <p className="font-semibold text-destructive">We hit a snag loading this section.</p>
      <p className="mt-2 text-muted-foreground">{toUserFacingMessage(normalized)}</p>
      <Button className="mt-4" variant="outline" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
};

export const PageErrorBoundary: React.FC<
  React.PropsWithChildren<{
    onReset?: () => void;
  }>
> = ({ children, onReset }) => (
  <ErrorBoundary
    FallbackComponent={PageErrorFallback}
    onReset={onReset}
    onError={(error, info) => {
      console.error('Unhandled page error', error, info);
    }}
  >
    {children}
  </ErrorBoundary>
);

export default PageErrorBoundary;
