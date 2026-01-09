import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the OAuth session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error('No session found after OAuth callback');
        }

        // Get the user's profile to determine their role
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, suspended, id, email, full_name')
          .eq('id', session.user.id)
          .single();

        // If profile doesn't exist, auto-create as worker (first-time OAuth user)
        if (profileError?.code === 'PGRST116') {
          // Check if user is pre-provisioned
          const { data: preProvisioned, error: preProvisionedError } = await supabase
            .from('pre_provisioned_users')
            .select('email, full_name, role, department_id')
            .eq('email', session.user.email)
            .single();

          let roleToAssign = 'worker' as 'worker' | 'manager' | 'root' | 'admin' | 'team_lead';
          let departmentId: string | null = null;
          let fullName = session.user.user_metadata?.full_name ||
                        session.user.user_metadata?.name ||
                        session.user.email?.split('@')[0] ||
                        'New User';

          // Save pre-provisioned user ID before any operations (needed for project assignment migration)
          const preProvisionedUserId = preProvisioned?.id;

          if (preProvisioned && !preProvisionedError) {
            // Use pre-provisioned settings
            console.log('Found pre-provisioned user:', preProvisioned.email);
            roleToAssign = preProvisioned.role;
            departmentId = preProvisioned.department_id;
            fullName = preProvisioned.full_name || fullName;

            console.log('Linked pre-provisioned user with role:', roleToAssign);
          } else {
            // Get the default department ID for non-pre-provisioned users
            const { data: defaultDept, error: deptError } = await supabase
              .from('departments')
              .select('id, is_active')
              .eq('department_name', 'Default Department')
              .eq('is_active', true)
              .single();

            if (deptError) {
              console.error('Failed to fetch default department:', deptError);
              toast.error('Account setup failed', {
                description: 'Unable to find default department. Please contact an administrator.',
              });
              await supabase.auth.signOut();
              navigate('/');
              return;
            }

            departmentId = defaultDept.id;
          }

          const newProfile = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: fullName,
            role: roleToAssign,
            department_id: departmentId, // Assign to pre-configured or default department
            password_changed_at: new Date().toISOString(), // OAuth users don't need password changes
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select('role, suspended, id, email, full_name')
            .single();

          if (createError) {
            console.error('Failed to create profile:', createError);
            toast.error('Account setup failed', {
              description: 'Unable to create your account. Please contact an administrator.',
            });
            await supabase.auth.signOut();
            navigate('/');
            return;
          }

          profile = createdProfile;

          // Migrate project assignments if user was pre-provisioned
          if (preProvisioned && !preProvisionedError && preProvisionedUserId) {
            try {
              // Find pre-assigned projects
              const { data: preAssignments, error: preAssignError } = await supabase
                .from('pre_provisioned_project_assignments')
                .select('project_id, assigned_by, assigned_at')
                .eq('pre_provisioned_user_id', preProvisionedUserId);

              if (!preAssignError && preAssignments && preAssignments.length > 0) {
                console.log(`Migrating ${preAssignments.length} project assignments`);

                // Create new assignments in project_assignments table
                const newAssignments = preAssignments.map(pa => ({
                  worker_id: createdProfile.id,
                  project_id: pa.project_id,
                  assigned_by: pa.assigned_by,
                  assigned_at: pa.assigned_at
                }));

                const { error: assignError } = await supabase
                  .from('project_assignments')
                  .insert(newAssignments);

                if (assignError) {
                  console.error('Failed to migrate project assignments:', assignError);
                } else {
                  // Delete from pre_provisioned_project_assignments
                  await supabase
                    .from('pre_provisioned_project_assignments')
                    .delete()
                    .eq('pre_provisioned_user_id', preProvisionedUserId);

                  console.log('Project assignments migrated successfully');
                }
              }

              // Delete from pre_provisioned_users after migration is complete
              await supabase
                .from('pre_provisioned_users')
                .delete()
                .eq('email', session.user.email);

            } catch (error) {
              console.error('Error migrating project assignments:', error);
              // Non-fatal error - continue with sign-in
            }

            toast.success('Welcome to PPH Maestro!', {
              description: `Your ${roleToAssign} account has been created successfully.`,
            });
          } else {
            toast.success('Welcome to PPH Maestro!', {
              description: 'Your worker account has been created successfully.',
            });
          }
        } else if (profileError) {
          // Other errors (not "not found")
          throw profileError;
        }

        // Check if user is suspended
        if (profile?.suspended) {
          toast.error('Account suspended', {
            description: 'Your account has been suspended. Please contact an administrator.',
          });
          await supabase.auth.signOut();
          navigate('/');
          return;
        }

        // Update last sign-in timestamp
        try {
          await supabase
            .from('profiles')
            .update({ last_sign_in_at: new Date().toISOString() })
            .eq('id', session.user.id);
        } catch (error) {
          console.error('Failed to mark last sign-in:', error);
        }

        // Navigate to appropriate dashboard based on role
        const isManager = profile.role === 'manager' || profile.role === 'root' || profile.role === 'admin';

        // Only show success message for returning users (new users already got a message)
        if (profileError?.code !== 'PGRST116') {
          toast.success('Welcome back!', {
            description: 'You have been successfully signed in with Google.',
          });
        }

        navigate(isManager ? '/m/dashboard' : '/w/dashboard');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'An error occurred during sign in');
        toast.error('Sign in failed', {
          description: err.message || 'An error occurred during sign in',
        });

        // Redirect to landing page after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Sign in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">Redirecting to sign in page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-2xl font-semibold">Completing sign in...</h1>
        <p className="text-sm text-muted-foreground">Please wait while we set up your session.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
