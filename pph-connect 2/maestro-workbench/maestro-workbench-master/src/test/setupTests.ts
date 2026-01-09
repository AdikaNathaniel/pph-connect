import '@testing-library/jest-dom';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error jsdom global patch
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

const defaultResponse = { data: [], error: null };

const createQueryBuilder = (response = defaultResponse) => {
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    lt: () => builder,
    lte: () => builder,
    gt: () => builder,
    gte: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(response),
    maybeSingle: () => Promise.resolve(response),
    then: (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(response).catch(onRejected),
  };
  return builder;
};

const tableOverrides = new Map<string, () => { data: unknown; error: unknown }>();

const mockFrom = vi.fn((table: string) => {
  const factory = tableOverrides.get(table);
  const response = factory ? factory() : defaultResponse;
  return createQueryBuilder(response);
});

const authMock = {
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  refreshSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  updateUser: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

const functionsMock = {
  invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

const rpcMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: authMock,
    functions: functionsMock,
    rpc: rpcMock,
  },
  __supabaseMock: {
    from: mockFrom,
    auth: authMock,
    functions: functionsMock,
    rpc: rpcMock,
    setTableResponse(table: string, factory: () => { data: unknown; error: unknown }) {
      tableOverrides.set(table, factory);
    },
    reset() {
      tableOverrides.clear();
      mockFrom.mockClear();
    },
  },
}));
