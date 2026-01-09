import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Users, Building2, Briefcase, ArrowLeft, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import RichTextEditor from '@/components/messaging/RichTextEditor';

interface User {
  id: string;
  full_name: string;
  worker_role: string;
  email: string;
  department_id?: string | null;
  supervisor_id?: string | null;
}

interface Department {
  id: string;
  department_name: string;
  department_code: string;
  is_active: boolean;
  manager_id: string | null;
}

interface Attachment {
  file: File;
  preview?: string;
}

type BroadcastType = 'department' | 'role' | 'custom';

const Broadcast: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('department');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [recipients, setRecipients] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Get base path based on user role
  const getBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchRecipientPreview();
    }
  }, [broadcastType, selectedDepartment, selectedRole, selectedUserIds, currentUserId]);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in');
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch departments
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('id, department_name, department_code, is_active, manager_id')
        .order('department_name');

      if (deptsError) throw deptsError;
      setDepartments((depts || []).filter((dept) => dept.is_active));

      // Fetch all workers (for custom selection)
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('id, full_name, worker_role, email_pph, email_personal, department_id, supervisor_id, status')
        .neq('id', user.id)
        .eq('status', 'active')
        .order('full_name');

      if (workersError) throw workersError;
      const mappedWorkers: User[] = (workers || []).map((worker) => ({
        id: worker.id,
        full_name: worker.full_name,
        worker_role: worker.worker_role ?? 'unknown',
        email: worker.email_pph ?? worker.email_personal ?? '',
        department_id: worker.department_id ?? null,
        supervisor_id: worker.supervisor_id ?? null
      }));
      setAllUsers(mappedWorkers);

    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchRecipientPreview = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('workers')
        .select('id, full_name, worker_role, email_pph, email_personal, department_id, supervisor_id, status')
        .neq('id', currentUserId)
        .eq('status', 'active');

      if (broadcastType === 'department' && selectedDepartment) {
        query = query.eq('department_id', selectedDepartment);
      } else if (broadcastType === 'role' && selectedRole) {
        query = query.eq('worker_role', selectedRole);
      } else if (broadcastType === 'custom') {
        if (selectedUserIds.length === 0) {
          setRecipients([]);
          setLoading(false);
          return;
        }
        query = query.in('id', selectedUserIds);
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;

      const mappedRecipients: User[] = (data || []).map((worker) => ({
        id: worker.id,
        full_name: worker.full_name,
        worker_role: worker.worker_role ?? 'unknown',
        email: worker.email_pph ?? worker.email_personal ?? '',
        department_id: worker.department_id ?? null,
        supervisor_id: worker.supervisor_id ?? null
      }));

      setRecipients(mappedRecipients);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to fetch recipients');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments allowed');
      return;
    }

    const newAttachments: Attachment[] = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // Reset input
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAttachments = async () => {
    const uploadedAttachments = [];

    for (const attachment of attachments) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `message-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, attachment.file);

        if (uploadError) throw uploadError;

        uploadedAttachments.push({
          path: filePath,
          name: attachment.file.name,
          size: attachment.file.size,
          type: attachment.file.type
        });
      } catch (error: any) {
        console.error('Error uploading attachment:', error);
        toast.error(`Failed to upload ${attachment.file.name}`);
      }
    }

    return uploadedAttachments;
  };

  const handleSendBroadcast = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!content.trim()) {
      toast.error('Message content is required');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmAndSend = async () => {
    setSending(true);
    setShowConfirmation(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to send messages');
        return;
      }

      // Upload attachments first
      const uploadedAttachments = await uploadAttachments();

      const recipientIds = recipients.map(r => r.id);

      console.log('[Broadcast] Sending to recipients:', recipientIds);
      console.log('[Broadcast] Subject:', subject);
      console.log('[Broadcast] Content length:', content.length);
      console.log('[Broadcast] Attachments:', uploadedAttachments.length);

      // Use supabase.functions.invoke for consistency with Compose
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          recipient_ids: recipientIds,
          subject: subject.trim(),
          content: content.trim(),
          attachments: uploadedAttachments
        }
      });

      if (error) {
        console.error('[Broadcast] Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[Broadcast] Response indicates failure:', data);
        throw new Error(data?.error || 'Failed to send broadcast');
      }

      console.log('[Broadcast] Success! Message ID:', data.message_id, 'Thread ID:', data.thread_id);
      toast.success(`Broadcast sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);

      // Clean up attachment previews
      attachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });

      // Reset form
      setSubject('');
      setContent('');
      setAttachments([]);
      setSelectedDepartment('');
      setSelectedRole('');
      setSelectedUserIds([]);
      setRecipients([]);

      // Navigate to sent messages
      navigate(`${getBasePath()}/inbox?tab=sent`);

    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'worker':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${getBasePath()}/inbox`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Broadcast Message</h1>
          <p className="text-muted-foreground">Send a message to multiple recipients at once</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
            <CardDescription>Compose your broadcast message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Type your message..."
                disabled={sending}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={sending || attachments.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('attachments')?.click()}
                  disabled={sending || attachments.length >= 5}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  {attachments.length}/5 files
                </span>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(attachment.file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemoveAttachment(index)}
                        disabled={sending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Recipient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
            <CardDescription>Choose who will receive this message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={broadcastType} onValueChange={(value) => setBroadcastType(value as BroadcastType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  By Department
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="role" id="role" />
                <Label htmlFor="role" className="flex items-center gap-2 cursor-pointer">
                  <Briefcase className="h-4 w-4" />
                  By Role
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Custom Selection
                </Label>
              </div>
            </RadioGroup>

            <Separator />

            {/* Department Selection */}
            {broadcastType === 'department' && (
              <div className="space-y-2">
                <Label>Select Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {`${dept.department_name} (${dept.department_code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role Selection */}
            {broadcastType === 'role' && (
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom User Selection */}
            {broadcastType === 'custom' && (
              <div className="space-y-2">
                <Label>Select Users</Label>
                <div className="border rounded-md max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-accent rounded"
                    >
                      <Checkbox
                        id={`broadcast-user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <label
                        htmlFor={`broadcast-user-${user.id}`}
                        className="flex-1 flex items-center justify-between cursor-pointer"
                      >
                        <span>{user.full_name}</span>
                        <Badge variant={getRoleBadgeColor(user.worker_role)} className="text-xs">
                          {user.worker_role}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipient Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipient Preview ({loading ? '...' : recipients.length})
          </CardTitle>
          <CardDescription>
            The following users will receive this message
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recipients selected</p>
              <p className="text-sm">Select a group or users above</p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{recipient.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                  </div>
                  <Badge variant={getRoleBadgeColor(recipient.worker_role)} className="ml-2">
                    {recipient.worker_role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`${getBasePath()}/inbox`)}
          disabled={sending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSendBroadcast}
          disabled={sending || recipients.length === 0 || !subject.trim() || !content.trim()}
        >
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" />
          Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm Broadcast</CardTitle>
              <CardDescription>
                Are you sure you want to send this message to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Subject:</p>
                <p className="text-sm text-muted-foreground">{subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Recipients:</p>
                <p className="text-sm text-muted-foreground">
                  {recipients.slice(0, 3).map(r => r.full_name).join(', ')}
                  {recipients.length > 3 && ` and ${recipients.length - 3} more`}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndSend}
                  disabled={sending}
                >
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm & Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Broadcast;
