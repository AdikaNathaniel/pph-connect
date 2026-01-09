import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Briefcase, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import VersionTracker from '@/components/VersionTracker';
import GoogleOAuthButton from '@/components/auth/GoogleOAuthButton';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'manager' | 'worker' | null>(null);

  const isManager = user?.role === 'manager' || user?.role === 'root';

  const roleFromQuery = searchParams.get('role') as 'manager' | 'worker' | null;

  useEffect(() => {
    if (roleFromQuery === 'manager' || roleFromQuery === 'worker') {
      setSelectedRole(roleFromQuery);
    } else {
      setSelectedRole(null);
    }
  }, [roleFromQuery]);

  const handleSelectRole = (role: 'manager' | 'worker') => {
    setSelectedRole(role);
    setSearchParams({ role });
  };

  const handleBack = () => {
    setSelectedRole(null);
    setSearchParams({});
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error('Sign in failed', {
          description: error.message,
        });
      } else {
        toast.success('Welcome back!', {
          description: 'You have been successfully signed in.',
        });
        navigate(isManager ? '/m/dashboard' : '/w/dashboard');
      }
    } catch (err) {
      toast.error('An error occurred', {
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showAuth = Boolean(selectedRole);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-8 lg:px-8">
        <div className="grid w-full max-w-[1568px] gap-0 lg:grid-cols-2 border border-border rounded-[calc(var(--radius)+4px)]">
          <section className="flex min-h-0 lg:min-h-[1200px] flex-col justify-between rounded-l-[calc(var(--radius)+4px)] bg-primary/5 px-10 py-12 text-primary shadow-sm">
            <div className="space-y-4 lg:space-y-32">
              <div className="flex items-center gap-3 text-primary">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white text-lg font-bold">
                  M
                </div>
                <span className="text-base font-semibold text-blue-900">PPH Maestro</span>
              </div>
              
              <div className="space-y-4">
              <h1 className="text-pretty text-4xl font-semibold leading-tight text-blue-900 lg:text-5xl">
                PPH Maestro: A unified Workspace for Productive Playhouse Data Operations
              </h1>
              <p className="text-base font-medium text-blue-900/80">
                Pick your portal to manage projects or sign into the Worker Portal to jump straight into task execution.
              </p>
              </div>
            </div>
            
            <p className="text-sm font-medium text-primary/70">
              <strong>"Quality means doing it right when no one is looking."</strong> - Henry Ford
            </p>
          </section>

          <section className="flex min-h-0 lg:min-h-[1200px] flex-col items-center justify-center px-8 py-12 lg:px-16">
            <div className="w-full max-w-md">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {showAuth ? `Sign in as ${selectedRole === 'manager' ? 'Manager' : 'Worker'}` : 'Choose your role'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {showAuth
                    ? 'Use your PPH Maestro credentials to continue.'
                    : 'Sign in through the portal that matches your responsibilities.'}
                </p>
              </div>

              <div className="relative">
                {!showAuth && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <Card className="border border-border shadow-sm">
                        <CardHeader className="space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            <Users className="h-4 w-4" /> Manager Portal
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold">Orchestrate every project</CardTitle>
                            <CardDescription className="text-sm leading-relaxed">
                              Build plugins, configure workflows, and monitor progress across your organization.
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              Create and manage projects with full visibility
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              Design reusable task templates and ontologies
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              Track analytics, SLAs, and quality metrics in real time
                            </li>
                          </ul>
                          <Button className="w-full" size="sm" onClick={() => handleSelectRole('manager')}>
                            Continue as Manager
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>

                    <Card className="border border-border shadow-sm">
                        <CardHeader className="space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary-foreground">
                            <Briefcase className="h-4 w-4" /> Worker Portal
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold">Launch tasks and start earning</CardTitle>
                            <CardDescription className="text-sm leading-relaxed">
                              Access assignments, generate responses, and hit your targets.
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground" />
                              Claim and complete prioritized tasks
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground" />
                              Follow guided workflows and instructions
                            </li>
                            <li className="flex items-center gap-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground" />
                              Track progress and performance instantly
                            </li>
                          </ul>
                          <Button
                            className="w-full"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSelectRole('worker')}
                          >
                            Continue as Worker
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                  </div>
                )}

                {showAuth && (
                  <div className="animate-in fade-in duration-300">
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader className="space-y-4 text-left">
                          <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                            {selectedRole === 'manager' ? <Users className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                            {selectedRole === 'manager' ? 'Manager Access' : 'Worker Access'}
                          </div>
                          <div className="space-y-2">
                            <CardTitle className="text-xl font-semibold leading-tight">
                              Sign in to your account
                            </CardTitle>
                            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                              Use your PPH Maestro credentials to continue
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <form onSubmit={handleSignIn} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="signin-email" className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                Email
                              </Label>
                              <Input
                                id="signin-email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signin-password" className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                Password
                              </Label>
                              <div className="relative">
                                <Input
                                  id="signin-password"
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Your password"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  required
                                  className="h-9 rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <Button type="submit" className="w-full" size="sm" disabled={isLoading}>
                              {isLoading ? 'Signing in...' : 'Sign In with Email'}
                            </Button>
                          </form>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                              </span>
                            </div>
                          </div>

                          <GoogleOAuthButton size="sm" />

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <button
                              type="button"
                              onClick={handleBack}
                              className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Back to role selection
                            </button>
                            <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {selectedRole === 'manager' ? 'Manager' : 'Worker'}
                            </span>
                          </div>
                          <p className="text-center text-xs text-muted-foreground">
                            By signing in, you agree to our{' '}
                            <a href="#" className="underline underline-offset-4">Terms of Service</a>{' '}
                            and{' '}
                            <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
                          </p>
                        </CardContent>
                      </Card>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer>
        <div className="flex items-center justify-end px-4 py-4 lg:px-8">
          <div className="w-full max-w-[1568px]">
            <div className="flex justify-end">
              <VersionTracker />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;