import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Users, Briefcase } from 'lucide-react';
import VersionTracker from '@/components/VersionTracker';
import GoogleOAuthButton from '@/components/auth/GoogleOAuthButton';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const role = searchParams.get('role') as 'manager' | 'worker' || 'worker';
  const isManager = role === 'manager';

  useEffect(() => {
    if (user) {
      navigate('/m/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Sign in failed", {
          description: error.message,
        });
      } else {
        // Update last sign-in timestamp (in addition to AuthContext listener)
        setTimeout(() => {
          supabase.rpc('mark_last_sign_in');
        }, 0);

        // Check if user is suspended or needs to change password
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_changed_at, initial_password_hash, suspended')
          .eq('id', userId)
          .single();

        if (profile?.suspended) {
          // User is suspended - sign them out immediately
          await supabase.auth.signOut();
          toast.error("Account Suspended", {
            description: "Your account has been suspended. Please contact an administrator.",
          });
          return;
        }

        if (profile && !profile.password_changed_at && profile.initial_password_hash) {
          // User needs to change password - redirect to password change flow
          navigate('/change-password');
          return;
        }

        toast.success("Welcome back!", {
          description: "You have been successfully signed in.",
        });
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-8 lg:px-8">
        <div className="grid w-full max-w-[1568px] gap-0 lg:grid-cols-2">
          <section className="hidden flex-col justify-between rounded-3xl border border-border/60 bg-primary/5 px-10 py-12 text-primary shadow-sm lg:flex">
            <div className="flex items-center gap-3 text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                M
              </div>
              <span className="text-base font-semibold">PPH Maestro</span>
            </div>
            <p className="text-sm font-medium text-primary/70">
              "Quality means doing it right when no one is looking." – Henry Ford
            </p>
          </section>

          <section className="flex flex-col items-center justify-center px-8 py-12 lg:px-16">
            <div className="mb-10 flex w-full max-w-md items-center justify-between text-sm">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to role selection
              </button>
              <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isManager ? 'Manager' : 'Worker'}
              </span>
            </div>

            <Card className="w-full max-w-md border border-border/60 shadow-sm">
              <CardHeader className="space-y-4 text-left">
                <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  {isManager ? <Users className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  {isManager ? 'Manager Access' : 'Worker Access'}
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
                      className="h-11 rounded-xl border border-border/70 bg-background text-base"
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
                        className="h-11 rounded-xl border border-border/70 bg-background pr-12 text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="h-11 w-full rounded-xl text-base font-medium" disabled={isLoading}>
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

                <GoogleOAuthButton />

                <p className="text-center text-xs text-muted-foreground">
                  By signing in, you agree to our{' '}
                  <a href="#" className="underline underline-offset-4">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <footer className="border-t">
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

export default Auth;