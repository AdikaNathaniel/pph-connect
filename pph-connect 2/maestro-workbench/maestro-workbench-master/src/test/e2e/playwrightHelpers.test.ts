import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const helpersPromise = import('../../../e2e/support/session');
type PageStub = ReturnType<typeof createPageStub>;

const createPageStub = () => {
  const fill = vi.fn();
  const click = vi.fn();
  const goto = vi.fn().mockResolvedValue(undefined);
  const waitForURL = vi.fn().mockResolvedValue(undefined);
  const waitForLoadState = vi.fn().mockResolvedValue(undefined);
  const waitForSelector = vi.fn().mockResolvedValue(undefined);
  const getByLabel = vi.fn().mockReturnValue({ fill });
  const getByRole = vi.fn().mockReturnValue({ click });
  return { goto, waitForURL, waitForLoadState, waitForSelector, getByLabel, getByRole, __fills: { fill, click } };
};

describe('Playwright helpers', () => {
  let page: PageStub;
  let loginAs: (page: unknown, options?: any) => Promise<void>;
  let navigateToApp: (page: unknown, path: string) => Promise<void>;

  beforeEach(async () => {
    ({ loginAs, navigateToApp } = await helpersPromise);
    page = createPageStub();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fills email/password and submits login form', async () => {
    await loginAs(page as any, {
      email: 'worker@example.com',
      password: 'secret',
      redirectTo: '/w/dashboard',
    });

    expect(page.goto).toHaveBeenCalledWith('/login?redirectTo=%2Fw%2Fdashboard');
    expect(page.getByLabel).toHaveBeenCalledWith('Email');
    expect(page.getByLabel).toHaveBeenCalledWith('Password');
    expect(page.__fills.fill).toHaveBeenCalledWith('worker@example.com');
    expect(page.__fills.fill).toHaveBeenCalledWith('secret');
    expect(page.getByRole).toHaveBeenCalledWith('button', { name: /sign in/i });
    expect(page.__fills.click).toHaveBeenCalled();
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
  });

  it('uses env fallbacks when credentials omitted', async () => {
    vi.stubEnv('PLAYWRIGHT_WORKER_EMAIL', 'env-worker@example.com');
    vi.stubEnv('PLAYWRIGHT_WORKER_PASSWORD', 'env-secret');

    await loginAs(page as any);

    expect(page.__fills.fill).toHaveBeenCalledWith('env-worker@example.com');
    expect(page.__fills.fill).toHaveBeenCalledWith('env-secret');
  });

  it('navigates to absolute paths and waits for load state', async () => {
    await navigateToApp(page as any, '/m/dashboard');

    expect(page.goto).toHaveBeenCalledWith('/m/dashboard');
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
  });

  it('supports waiting for specific selectors when navigating', async () => {
    const waitForSelector = vi.fn().mockResolvedValue(undefined);
    (page as any).waitForSelector = waitForSelector;

    await navigateToApp(page as any, '/m/workers', { waitForSelector: '[data-testid="workers-table"]' });

    expect(waitForSelector).toHaveBeenCalledWith('[data-testid="workers-table"]');
    expect(page.waitForLoadState).not.toHaveBeenCalled();
  });

  it('throws for invalid relative paths', async () => {
    await expect(navigateToApp(page as any, 'm/dashboard')).rejects.toThrow(/start with/);
  });
});
