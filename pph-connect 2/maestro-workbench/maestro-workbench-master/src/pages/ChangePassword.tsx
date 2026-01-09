import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';

const ChangePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const clearForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user actually needs to change password
    const checkPasswordStatus = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_changed_at, initial_password_hash')
        .eq('id', user.id)
        .single();

      if (profile && profile.password_changed_at && !profile.initial_password_hash) {
        // Password already changed, redirect to dashboard
        navigate('/m/dashboard');
      }
    };

    checkPasswordStatus();
  }, [user, navigate]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation don't match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    // Additional validation to match UI requirements
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast.error("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/\d/.test(newPassword)) {
      toast.error("Password must contain at least one number.");
      return;
    }

    setIsLoading(true);

    try {
      // Update password using Supabase auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // Mark password as changed in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          password_changed_at: new Date().toISOString(),
          initial_password_hash: null
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }

      toast.success("Your password has been successfully changed.");

      // Ensure fresh auth and profile state, then redirect based on user role
      await supabase.auth.refreshSession();
      setTimeout(() => {
        // Use proper role-based routing instead of hard redirect
        const isManager = user?.user_metadata?.role === 'manager';
        window.location.assign(isManager ? '/m/dashboard' : '/w/dashboard');
      }, 150);
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || "Failed to update password. Please try again.");
      
      // Clear form on error to prevent spiral
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-warning/10 border border-warning/20 rounded-full w-fit">
              <Lock className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="text-2xl">Change Password Required</CardTitle>
            <CardDescription>
              You must change your password before accessing the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Password Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    At least 8 characters long
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Contains uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Contains lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/\d/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Contains number
                  </li>
                  <li className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Contains special character (recommended)
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Change Password"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={clearForm}
                  disabled={isLoading}
                  className="px-4"
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;