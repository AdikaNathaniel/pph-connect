import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Phone, Shield, CircleDollarSign, UserCircle, RefreshCcw, Link as LinkIcon, Award } from 'lucide-react';
import { calculateWorkerBalance } from '@/services/balanceService';
import { getWorkerAchievementProgress, type WorkerAchievementProgress } from '@/services/achievementTrackingService';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};

const formatCurrencyValue = (amount: number, currency: string | null) => {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }
  return amount.toLocaleString();
};

const formatPhone = (value: string | null) => value ?? 'Not provided';

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

type WorkerAccountRow = Pick<
  Database['public']['Tables']['worker_accounts']['Row'],
  'id' | 'worker_account_email' | 'platform_type' | 'status' | 'is_current' | 'updated_at'
>;

export const WorkerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<WorkerAccountRow[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [earnings, setEarnings] = useState<{ amount: number; currency: string | null }>({
    amount: 0,
    currency: null,
  });
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [achievements, setAchievements] = useState<WorkerAchievementProgress[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const workerPhone = (user && (user as { phone?: string | null }).phone) ?? null;

  useEffect(() => {
    if (!user?.id) {
      setAccounts([]);
      return;
    }

    let isCancelled = false;
    setAccountsLoading(true);

    supabase
      .from('worker_accounts')
      .select('id, worker_account_email, platform_type, status, is_current, updated_at')
      .eq('worker_id', user.id)
      .order('is_current', { ascending: false })
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (isCancelled) return;
        if (error) {
          console.error('WorkerProfile: failed to load worker accounts', error);
          toast.error('Unable to load connected accounts');
          setAccounts([]);
        } else {
          setAccounts(data ?? []);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setAccountsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const refreshEarnings = React.useCallback(async () => {
    if (!user?.id) {
      setEarnings({ amount: 0, currency: null });
      return;
    }
    setEarningsLoading(true);
    try {
      const { start, end } = getCurrentMonthRange();
      const summary = await calculateWorkerBalance(user.id, start, end);
      setEarnings({ amount: summary.total, currency: summary.currency });
    } catch (error) {
      console.warn('WorkerProfile: failed to load earnings summary', error);
      toast.error('Unable to load earnings summary');
      setEarnings({ amount: 0, currency: null });
    } finally {
      setEarningsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshEarnings().catch((error) => {
      console.warn('WorkerProfile: unexpected earnings error', error);
    });
  }, [refreshEarnings]);

  useEffect(() => {
    if (!user?.id) {
      setAchievements([]);
      return;
    }
    let isCancelled = false;
    setAchievementsLoading(true);
    getWorkerAchievementProgress(user.id)
      .then((progress) => {
        if (!isCancelled) {
          setAchievements(progress);
        }
      })
      .catch((error) => {
        console.warn('WorkerProfile: failed to load achievements', error);
        if (!isCancelled) {
          toast.error('Unable to load achievements right now');
          setAchievements([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setAchievementsLoading(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const profileFields = useMemo(() => (
    [
      { label: 'Full name', value: user?.full_name ?? '—' },
      { label: 'User ID', value: user?.id ?? '—' },
      { label: 'Role', value: user?.role ?? 'worker' },
      { label: 'Status', value: user?.suspended ? 'Suspended' : 'Active' },
      { label: 'Member since', value: formatDate(user?.created_at ?? null) },
      { label: 'Last sign-in', value: formatDate(user?.last_sign_in_at ?? null) },
    ]
  ), [user?.created_at, user?.full_name, user?.id, user?.last_sign_in_at, user?.role, user?.suspended]);

  const contactFields = useMemo(() => (
    [
      { icon: Mail, label: 'Primary email', value: user?.email ?? '—' },
      { icon: Phone, label: 'Phone number', value: formatPhone(workerPhone) },
      { icon: Shield, label: 'Security status', value: user?.password_changed_at ? 'Password updated' : 'Initial password active' },
    ]
  ), [user?.email, user?.password_changed_at, workerPhone]);

  const earnedAchievementsCount = useMemo(() => achievements.filter((achievement) => achievement.earned).length, [achievements]);

return (
  <div className="bg-background min-h-screen">
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Worker profile</p>
          <h1 className="text-3xl font-bold">Account Overview</h1>
        </div>
        <Badge variant={user?.suspended ? 'destructive' : 'secondary'}>
          {user?.suspended ? 'Suspended' : 'Active'}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" data-testid="worker-profile-tabs">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="overview" className="rounded-full border border-border/60 px-4 py-2 text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="rounded-full border border-border/60 px-4 py-2 text-sm">
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <Card data-testid="worker-profile-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Worker details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {profileFields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">{field.label}</dt>
                    <dd className="text-base font-medium text-foreground">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card data-testid="worker-profile-contact">
            <CardHeader>
              <CardTitle>Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactFields.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  </div>
                  {label === 'Primary email' ? (
                    <Button variant="outline" size="sm">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card data-testid="worker-profile-accounts">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Platform accounts</CardTitle>
                <p className="text-sm text-muted-foreground">Active credentials connected to Maestro.</p>
              </div>
              <Badge variant="outline">{accounts.length} linked</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountsLoading ? (
                <p className="text-sm text-muted-foreground">Loading accounts…</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No platform accounts are linked to this worker.</p>
              ) : (
                <div className="space-y-3" data-testid="worker-profile-accounts-list">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{account.worker_account_email}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {account.platform_type ?? 'Unknown platform'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.is_current ? <Badge variant="secondary">Current</Badge> : null}
                        <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>
                          {account.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Updated {formatDate(account.updated_at ?? null)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="worker-profile-earnings">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Earnings summary</CardTitle>
                <p className="text-sm text-muted-foreground">Month-to-date balance across all projects.</p>
              </div>
              <Button variant="outline" size="sm" onClick={refreshEarnings} disabled={earningsLoading}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <CircleDollarSign className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">This month</p>
                  <p className="text-3xl font-bold">
                    {earningsLoading ? 'Syncing…' : formatCurrencyValue(earnings.amount, earnings.currency)}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                Earnings summaries refresh automatically every few minutes. Values represent approved stats only.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card data-testid="worker-profile-achievements">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Achievements</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Celebrate milestones and see what it takes to unlock the next badge.
                </p>
              </div>
              <Badge variant="outline">
                {earnedAchievementsCount}/{achievements.length || 0} earned
              </Badge>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <p className="text-sm text-muted-foreground">Loading achievements…</p>
              ) : achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No achievements are configured yet. Check back soon for new goals.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2" data-testid="worker-achievements-list">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      data-testid="worker-achievement-card"
                      className={`flex flex-col gap-3 rounded-lg border p-4 transition ${
                        achievement.earned ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-dashed border-border/60 bg-muted/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                              achievement.earned ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {achievement.icon?.trim() || <Award className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{achievement.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {achievement.earned
                                ? `Unlocked ${formatDate(achievement.earnedAt ?? null)}`
                                : 'Locked'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={achievement.earned ? 'default' : 'outline'}>
                          {achievement.earned ? 'Earned' : 'Locked'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description ?? 'Complete the requirement to unlock this badge.'}
                      </p>
                      {achievement.earned ? (
                        <p className="text-xs font-medium text-primary">Achievement completed</p>
                      ) : (
                        <>
                          <Progress value={achievement.progressPercent} aria-label={`${achievement.name} progress`} />
                          <p className="text-xs text-muted-foreground">{achievement.progressLabel}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);
};

export default WorkerProfilePage;
