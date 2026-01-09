import { supabase } from '@/integrations/supabase/client';

export type WorkerLogLevel = 'info' | 'warn' | 'error';

interface WorkerLogEntry {
  level: WorkerLogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown> | null;
  stack?: string;
  occurredAt: string;
  workerId?: string;
  projectId?: string;
}

interface LoggerState {
  workerId?: string;
  projectId?: string;
}

const BUFFER_LIMIT = 50;
const FLUSH_DEBOUNCE_MS = 1500;

let buffer: WorkerLogEntry[] = [];
let flushTimer: number | null = null;
let isFlushing = false;
let isInstalled = false;
const state: LoggerState = {};

function scheduleFlush(immediate = false) {
  if (immediate) {
    flushBuffer();
    return;
  }

  if (flushTimer !== null) {
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushBuffer();
  }, FLUSH_DEBOUNCE_MS);
}

function pushToBuffer(entry: Omit<WorkerLogEntry, 'occurredAt' | 'workerId' | 'projectId'>) {
  const log: WorkerLogEntry = {
    ...entry,
    occurredAt: new Date().toISOString(),
    workerId: state.workerId,
    projectId: state.projectId,
  };

  buffer.push(log);

  if (buffer.length > BUFFER_LIMIT) {
    buffer.shift();
  }
}

async function flushBuffer() {
  if (isFlushing || buffer.length === 0) {
    return;
  }

  if (!state.workerId) {
    // Cannot insert without worker context because of RLS.
    return;
  }

  isFlushing = true;
  const payload = buffer;
  buffer = [];

  try {
    const insertPayload = payload.map((entry) => ({
      worker_id: entry.workerId,
      project_id: entry.projectId ?? null,
      level: entry.level,
      message: entry.message,
      context: entry.context ?? null,
      metadata: entry.metadata ?? null,
      stack: entry.stack ?? null,
      occurred_at: entry.occurredAt,
      created_at: entry.occurredAt,
    }));

    if (insertPayload.length === 0) {
      return;
    }

    const { error } = await supabase.from('client_logs').insert(insertPayload);

    if (error) {
      console.warn('Worker logger failed to persist logs', error);
      buffer.unshift(...payload);
    }
  } catch (error) {
    console.warn('Worker logger encountered unexpected error', error);
    buffer.unshift(...payload);
  } finally {
    isFlushing = false;
  }
}

export function installWorkerLogger() {
  if (typeof window === 'undefined' || isInstalled) {
    return;
  }

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    try {
      logWorkerEvent('error', args.map(formatPart).join(' '), 'console.error');
    } catch (loggingError) {
      originalError('Worker logger failed to capture console.error', loggingError);
    }

    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    try {
      logWorkerEvent('warn', args.map(formatPart).join(' '), 'console.warn');
    } catch (loggingError) {
      originalError('Worker logger failed to capture console.warn', loggingError);
    }

    originalWarn(...args);
  };

  window.addEventListener('error', (event) => {
    logWorkerEvent('error', event.message, 'global_error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : formatPart(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;
    logWorkerEvent('error', reason, 'unhandled_rejection', undefined, stack);
  });

  window.addEventListener('beforeunload', () => flushWorkerLogs({ immediate: true }));
  window.addEventListener('pagehide', () => flushWorkerLogs({ immediate: true }));

  isInstalled = true;
}

export function configureWorkerLogger(context: LoggerState) {
  state.workerId = context.workerId ?? state.workerId;
  state.projectId = context.projectId ?? state.projectId;

  if (state.workerId && buffer.length > 0) {
    scheduleFlush();
  }
}

export function logWorkerEvent(
  level: WorkerLogLevel,
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
  stack?: string
) {
  if (typeof window === 'undefined') {
    return;
  }

  pushToBuffer({
    level,
    message,
    context,
    metadata: metadata ?? null,
    stack,
  });

  if (level === 'error') {
    scheduleFlush(true);
  } else {
    scheduleFlush();
  }
}

export function flushWorkerLogs(options?: { immediate?: boolean }) {
  if (typeof window === 'undefined') {
    return;
  }

  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  scheduleFlush(options?.immediate ?? false);
}

function formatPart(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return '[unserializable object]';
    }
  }
  return String(value);
}

