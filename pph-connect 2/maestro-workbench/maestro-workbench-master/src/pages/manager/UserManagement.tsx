import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, Trash2, RotateCcw, Ban, CheckCircle, Edit2, Save, X, Copy, Eye, EyeOff, Upload, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User, ProjectAssignment, Project, Task } from '@/types';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Generate a secure random password
 * Security: Uses cryptographically secure random values instead of hardcoded passwords
 */
const generateSecurePassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  // Ensure password meets complexity requirements
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  
  if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
    // Recursively generate until we get a valid password
    return generateSecurePassword();
  }
  
  return password;
};

const UserManagement = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'worker' as 'manager' | 'worker'
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '' });
  const [assignmentStatus, setAssignmentStatus] = useState<Record<string, string>>({});
  
  // Password display modal state
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    email: string;
    password: string;
  }>({
    isOpen: false,
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    created: number;
    skipped: number;
    errors: number;
    results: Array<{ email: string; status: string; reason?: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-provisioned users state
  const [preProvisionedUsers, setPreProvisionedUsers] = useState<Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    department_id: string;
    provisioned_at: string;
    provisioned_by: string;
  }>>([]);
  const [loadingPreProvisioned, setLoadingPreProvisioned] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchPreProvisionedUsers();
  }, []);

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(passwordModal.password);
      toast.success("Password copied to clipboard");
    } catch (error) {
      toast("Clipboard unavailable", {
        description: "Please manually copy the password shown above"
      });
    }
  };

  const closePasswordModal = () => {
    setPasswordModal({ isOpen: false, email: '', password: '' });
    setShowPassword(false);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
      
      // Fetch assignment status for all workers
      await fetchAssignmentStatus(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentStatus = async (userList: User[]) => {
    const workerIds = userList.filter(u => u.role === 'worker').map(u => u.id);
    if (workerIds.length === 0) return;

    try {
      // Fetch assignments, projects, and tasks
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('worker_id, project_id')
        .in('worker_id', workerIds);

      if (!assignments || assignments.length === 0) {
        const status: Record<string, string> = {};
        workerIds.forEach(id => status[id] = 'unassigned');
        setAssignmentStatus(status);
        return;
      }

      const projectIds = [...new Set(assignments.map(a => a.project_id))];
      
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status')
        .in('id', projectIds);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectIds)
        .eq('status', 'pending');

      const status: Record<string, string> = {};
      
      workerIds.forEach(workerId => {
        const workerAssignments = assignments.filter(a => a.worker_id === workerId);
        
        if (workerAssignments.length === 0) {
          status[workerId] = 'unassigned';
          return;
        }

        const activeProjects = workerAssignments.filter(a => {
          const project = projects?.find(p => p.id === a.project_id);
          return project?.status === 'active';
        });

        if (activeProjects.length === 0) {
          status[workerId] = 'unassigned';
          return;
        }

        const hasPendingTasks = activeProjects.some(a => {
          return tasks?.some(t => t.project_id === a.project_id);
        });

        status[workerId] = hasPendingTasks ? 'assigned (active)' : 'assigned (idle)';
      });

      setAssignmentStatus(status);
    } catch (error) {
      console.error('Error fetching assignment status:', error);
    }
  };

  const fetchPreProvisionedUsers = async () => {
    try {
      setLoadingPreProvisioned(true);
      const { data, error } = await supabase
        .from('pre_provisioned_users')
        .select('*')
        .order('provisioned_at', { ascending: false });

      if (error) throw error;
      setPreProvisionedUsers(data || []);
    } catch (error) {
      console.error('Error fetching pre-provisioned users:', error);
      toast.error("Failed to fetch pre-provisioned users");
    } finally {
      setLoadingPreProvisioned(false);
    }
  };

  const handleDeletePreProvisionedUser = async (userId: string, userEmail: string) => {
    try {
      const { error } = await supabase
        .from('pre_provisioned_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userEmail} removed from pre-provisioned list`);
      fetchPreProvisionedUsers();
    } catch (error: any) {
      console.error('Error deleting pre-provisioned user:', error);
      toast.error(error.message || "Failed to delete pre-provisioned user");
    }
  };

const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newUser.email || !newUser.full_name) {
    toast.error("Email and full name are required");
    return;
  }

  try {
    setCreating(true);

    // Generate a secure random password
    const tempPassword = generateSecurePassword();

    // Create user via Edge Function (avoids gen_salt/pgcrypto issues)
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        password: tempPassword
      }
    });

    if (error) throw error;

    // Show password modal instead of toast
    setPasswordModal({
      isOpen: true,
      email: newUser.email,
      password: tempPassword
    });

    setNewUser({ email: '', full_name: '', role: 'worker' });
    fetchUsers();
  } catch (error: any) {
    console.error('Error creating user:', error);
    const msg: string = error?.message || '';
    const emailExists = /already been registered|email_exists|409/.test(msg);
    
    if (emailExists) {
      // Automatically wipe the old user and retry
      toast("Email conflict detected", { description: "Wiping previous user and retrying..." });
      
      try {
        const { data: wipeData, error: wipeErr }: any = await supabase.functions.invoke('wipe-user-by-email', {
          body: { email: newUser.email }
        });
        // If user not found (404), proceed to retry creation anyway
        const wipeStatus = (wipeErr as any)?.status;
        if (wipeErr && wipeStatus && wipeStatus !== 404) {
          console.error('Failed to wipe user', wipeErr);
          toast.error("Failed to remove previous user. Please contact support.");
          return;
        }
        // small delay to ensure auth deletion propagation
        await new Promise((r) => setTimeout(r, 500));
        
        // Generate a new secure random password for retry
        const retryTempPassword = generateSecurePassword();
        
        // Retry user creation
        const { data: retryData, error: retryErr } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            password: retryTempPassword
          }
        });
        
        if (retryErr) throw retryErr;
        
        // Show password modal for retry as well
        setPasswordModal({
          isOpen: true,
          email: newUser.email,
          password: retryTempPassword
        });
        
        setNewUser({ email: '', full_name: '', role: 'worker' });
        fetchUsers();
      } catch (retryError: any) {
        console.error('Retry failed:', retryError);
        toast.error(retryError?.message || "Failed to create user after wipe");
      }
    } else {
      toast.error(msg || "Failed to create user");
    }
  } finally {
    setCreating(false);
  }
};

  const handleToggleSuspend = async (userId: string, currentlySuspended: boolean, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: !currentlySuspended })
        .eq('id', userId);
      
      if (error) throw error;

      toast.success(`${userName} ${currentlySuspended ? 'unsuspended' : 'suspended'} successfully`);
      
      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling suspend:', error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    try {
      // Fully wipe using Edge Function (cleans app data and auth user)
      const { data, error }: any = await supabase.functions.invoke('wipe-user-by-email', {
        body: { email: userEmail }
      });

      if (error) throw error;

      toast.success(`${userName} fully wiped`);

      // Small delay to allow auth deletion to propagate
      await new Promise((r) => setTimeout(r, 300));
      fetchUsers();
    } catch (error: any) {
      console.error('Error wiping user:', error);
      toast.error(error?.message || "Failed to wipe user");
    }
  };

  const canModifyUser = (targetUser: User) => {
    if (!currentUser) return false;
    if (currentUser.role === 'root') return true;
    if (currentUser.role === 'admin' && (targetUser.role === 'worker' || targetUser.role === 'manager')) return true; // Admin can modify workers and managers
    if (currentUser.role === 'manager' && targetUser.role === 'worker') return true; // Manager can only modify workers
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setCsvFile(file);
      setUploadResults(null);
    }
  };

  const parseCSV = (text: string): string[] => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Get header
    const header = lines[0].toLowerCase().trim();
    if (!header.includes('email')) {
      throw new Error('CSV must have an "email" column');
    }

    // Parse emails
    const emails: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const email = lines[i].trim();
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setUploading(true);
      setUploadResults(null);

      // Read CSV file
      const text = await csvFile.text();
      const emails = parseCSV(text);

      if (emails.length === 0) {
        toast.error('No valid emails found in CSV');
        return;
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('bulk-provision-users', {
        body: { emails }
      });

      if (error) throw error;

      setUploadResults(data);

      toast.success(`Bulk import complete!`, {
        description: `${data.created} created, ${data.skipped} skipped, ${data.errors} errors`
      });

      // Clear file input
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh user lists
      fetchUsers();
      fetchPreProvisionedUsers();
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast.error(error.message || 'Failed to process CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId }
      });

      if (error) throw error;

      toast.success(`New temporary password for ${userName}: ${data.temporaryPassword}`);

      fetchUsers();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || "Failed to reset password");
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editForm.full_name,
          role: editForm.role as 'manager' | 'worker' | 'root'
        })
        .eq('id', userId);
      
      if (error) throw error;

      toast.success("User updated successfully");
      
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || "Failed to update user");
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user.id);
    setEditForm({ full_name: user.full_name, role: user.role });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ full_name: '', role: '' });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root': return 'bg-destructive text-destructive-foreground';
      case 'admin': return 'bg-orange-500 text-white';
      case 'manager': return 'bg-primary text-primary-foreground';
      case 'worker': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAssignmentBadge = (userId: string, role: string) => {
    if (role !== 'worker') return null;
    
    const status = assignmentStatus[userId] || 'unassigned';
    const variant = status === 'assigned (active)' ? 'default' : 
                    status === 'assigned (idle)' ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/m/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: 'manager' | 'worker' | 'admin') => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </Button>
              <p className="text-sm text-muted-foreground">
                A unique temporary password will be generated and displayed for you to share
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bulk Import CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import from CSV (OAuth Users)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>CSV Format</AlertTitle>
            <AlertDescription>
              Upload a CSV file with a single column named <code className="bg-muted px-1 py-0.5 rounded">email</code>.
              Users will be pre-provisioned as <strong>workers</strong> and assigned to the <strong>Default Department</strong>.
              When they sign in with Google OAuth, they'll be automatically activated.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              <Button
                onClick={handleBulkUpload}
                disabled={!csvFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>

            {csvFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {csvFile.name}
              </p>
            )}
          </div>

          {/* Upload Results */}
          {uploadResults && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Total</div>
                      <div className="text-2xl">{uploadResults.total}</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Created
                      </div>
                      <div className="text-2xl text-green-600">{uploadResults.created}</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Skipped
                      </div>
                      <div className="text-2xl text-yellow-600">{uploadResults.skipped}</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Errors
                      </div>
                      <div className="text-2xl text-red-600">{uploadResults.errors}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              {uploadResults.results.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {uploadResults.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded flex items-center gap-2 text-sm ${
                        result.status === 'created'
                          ? 'bg-green-50 text-green-800'
                          : result.status === 'skipped'
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {result.status === 'created' && <CheckCircle2 className="h-4 w-4" />}
                      {result.status === 'skipped' && <AlertCircle className="h-4 w-4" />}
                      {result.status === 'error' && <XCircle className="h-4 w-4" />}
                      <span className="font-medium">{result.email}</span>
                      {result.reason && (
                        <span className="text-xs">- {result.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Example CSV format:</strong></p>
            <pre className="bg-muted p-2 rounded">
email{'\n'}
john.doe@company.com{'\n'}
jane.smith@company.com{'\n'}
bob.johnson@company.com
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Pre-Provisioned Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pre-Provisioned Users (Awaiting Sign-In)</span>
            <Badge variant="secondary">{preProvisionedUsers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPreProvisioned ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : preProvisionedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users waiting to sign in.</p>
              <p className="text-sm mt-2">Upload a CSV to pre-provision users for OAuth sign-in.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {preProvisionedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        Pending OAuth Sign-In
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Role: <span className="font-medium">{user.role}</span></span>
                      <span>•</span>
                      <span>Provisioned: {new Date(user.provisioned_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(user.email);
                        toast.success('Email copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Email
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Pre-Provisioned User?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove <strong>{user.email}</strong> from the pre-provisioned list.
                            They will not be able to sign in with a pre-configured role.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePreProvisionedUser(user.id, user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    {editingUser === user.id ? (
                      <div className="space-y-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editForm.full_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Full Name"
                            className="max-w-xs"
                          />
                          <Select 
                            value={editForm.role} 
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                          >
                            <SelectTrigger className="max-w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="worker">Worker</SelectItem>
                              {(currentUser?.role === 'root' || currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
                                <>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleUpdateUser(user.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{user.full_name}</h3>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                        {getAssignmentBadge(user.id, user.role)}
                        {user.password_changed_at ? (
                          <Badge variant="outline">Password Updated</Badge>
                        ) : (
                          <Badge variant="destructive">Needs Password Change</Badge>
                        )}
                        {user.role === 'root' ? (
                          <Button size="sm" variant="ghost" disabled>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        ) : canModifyUser(user) ? (
                          <Button size="sm" variant="ghost" onClick={() => startEditing(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                     <div className="text-xs text-muted-foreground space-y-1 mt-2">
                       <p>Created: {new Date(user.created_at).toLocaleDateString()} at {new Date(user.created_at).toLocaleTimeString()}</p>
                       {user.last_sign_in_at ? (
                         <p>Last logged in: {new Date(user.last_sign_in_at).toLocaleDateString()} at {new Date(user.last_sign_in_at).toLocaleTimeString()}</p>
                       ) : (
                         <p>Last logged in: Never</p>
                       )}
                     </div>
                     {user.suspended && (
                       <Badge variant="destructive" className="mt-2">Suspended</Badge>
                     )}
                   </div>
                   <div className="flex gap-2">
                      {user.role === 'root' ? (
                        <>
                          <Button variant="outline" size="sm" disabled>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset Password
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            {user.suspended ? <CheckCircle className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                            {user.suspended ? 'Unsuspend' : 'Suspend'}
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      ) : canModifyUser(user) ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reset Password
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will generate a new temporary password for {user.full_name}. They will need to change it on their next login.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleResetPassword(user.id, user.full_name)}>
                                  Reset Password
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                {user.suspended ? <CheckCircle className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                                {user.suspended ? 'Unsuspend' : 'Suspend'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{user.suspended ? 'Unsuspend' : 'Suspend'} User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to {user.suspended ? 'unsuspend' : 'suspend'} {user.full_name}? 
                                  {!user.suspended && ' They will not be able to log in while suspended.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleToggleSuspend(user.id, user.suspended || false, user.full_name)}>
                                  {user.suspended ? 'Unsuspend' : 'Suspend'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.full_name, user.email)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : null}
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Display Modal */}
      <Dialog open={passwordModal.isOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Temporary password for {passwordModal.email}. Copy this password and share it securely with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="temp-password">Temporary Password</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="temp-password"
                  type={showPassword ? "text" : "password"}
                  value={passwordModal.password}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> This password is shown only once. Make sure to copy it before closing this dialog.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closePasswordModal} className="w-full">
              I've Copied the Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;