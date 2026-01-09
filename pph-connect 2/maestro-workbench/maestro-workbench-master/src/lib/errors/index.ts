export type NormalizedError = {
  message: string;
  code?: string | number;
  status?: number;
  cause?: unknown;
};

export const isSupabaseError = (error: unknown): error is { message: string; code?: string; status?: number } => {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as any).message === 'string' &&
      ('code' in error || 'status' in error)
  );
};

export const isNetworkError = (error: unknown): boolean => {
  return (
    (error instanceof TypeError && /\bfetch\b/i.test(error.message)) ||
    (typeof error === 'object' && error !== null && 'isAxiosError' in error)
  );
};

export const normalizeError = (error: unknown): NormalizedError => {
  if (isSupabaseError(error)) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      cause: error
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      cause: error
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown error occurred', cause: error };
};

export const toUserFacingMessage = (error: NormalizedError | unknown): string => {
  const normalized = isNormalizedError(error) ? error : normalizeError(error);

  if (normalized.status === 401 || normalized.status === 403) {
    return 'Your session may have expired. Try signing in again.';
  }

  if (normalized.status === 404) {
    return 'The requested resource could not be found.';
  }

  if (
    normalized.code === '23505' ||
    normalized.status === 409 ||
    (!!normalized.message && /duplicate key value/i.test(normalized.message))
  ) {
    return 'That value is already in use. Choose a different value.';
  }

  if (isNetworkError(normalized.cause)) {
    return 'Network connection lost. Check your internet connection and retry.';
  }

  return normalized.message || 'An unexpected error occurred.';
};

const isNormalizedError = (value: unknown): value is NormalizedError => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'message' in value &&
      typeof (value as any).message === 'string'
  );
};
