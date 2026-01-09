import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, X, Upload, ArrowLeft, Send, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import RichTextEditor from '@/components/messaging/RichTextEditor';

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  worker_role: string;
}

interface AttachmentFile {
  file: File;
  id: string;
}

interface UploadedAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

const Compose: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sending, setSending] = useState(false);
  const [availableRecipients, setAvailableRecipients] = useState<UserOption[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<UserOption[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Get base path based on user role
  const getBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  useEffect(() => {
    fetchCurrentUserAndRecipients();
  }, []);

  const fetchCurrentUserAndRecipients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to send messages');
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      // Get current worker record to check their role
      const { data: workerRecord, error: workerError } = await supabase
        .from('workers')
        .select('worker_role')
        .eq('id', user.id)
        .single();

      if (workerError) throw workerError;

      setCurrentUserRole(workerRecord?.worker_role || null);

      // Fetch available recipients (all workers except self and inactive)
      let query = supabase
        .from('workers')
        .select('id, full_name, email_personal, email_pph, worker_role, status')
        .neq('id', user.id)
        .eq('status', 'active');

      // If current user is a worker, exclude other workers from recipients
      if (workerRecord?.worker_role === 'worker') {
        query = query.neq('worker_role', 'worker');
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;

      const mapped = (data || []).map((recipient) => ({
        id: recipient.id,
        full_name: recipient.full_name,
        email: recipient.email_pph ?? recipient.email_personal ?? '',
        worker_role: recipient.worker_role ?? 'unknown'
      }));

      setAvailableRecipients(mapped);
      setFilteredRecipients(mapped);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to load recipients');
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Filter recipients based on search query
  useEffect(() => {
    if (!recipientSearchQuery.trim()) {
      setFilteredRecipients(availableRecipients);
    } else {
      const filtered = availableRecipients.filter((worker) =>
        worker.full_name.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(recipientSearchQuery.toLowerCase()) ||
        worker.worker_role.toLowerCase().includes(recipientSearchQuery.toLowerCase())
      );
      setFilteredRecipients(filtered);
    }
  }, [recipientSearchQuery, availableRecipients]);

  const handleRecipientToggle = (userId: string) => {
    setRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file sizes (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    // Validate file types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const validTypedFiles = validFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has an unsupported type.`);
        return false;
      }
      return true;
    });

    const newAttachments: AttachmentFile[] = validTypedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const uploadAttachments = async (): Promise<UploadedAttachment[]> => {
    if (attachments.length === 0 || !currentUserId) return [];

    const uploadedAttachments: UploadedAttachment[] = [];

    for (const attachment of attachments) {
      try {
        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
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
        // Continue uploading other files
      }
    }

    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (recipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter message content');
      return;
    }

    setSending(true);

    try {
      // Upload attachments first
      const uploadedAttachments = await uploadAttachments();

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again');
        navigate('/');
        return;
      }

      // Call send-message edge function
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          recipient_ids: recipients,
          subject: subject.trim(),
          content: content.trim(),
          attachments: uploadedAttachments
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Message sent successfully!');
        navigate(`${getBasePath()}/inbox`);
      } else {
        throw new Error(data?.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
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

  const selectedRecipientsList = availableRecipients.filter(r => recipients.includes(r.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${getBasePath()}/inbox`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compose Message</h1>
          <p className="text-muted-foreground">Send a new message</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipients */}
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients *</Label>

              {loadingRecipients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Recipient Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipients by name, email, or role..."
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {recipientSearchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setRecipientSearchQuery('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                    {filteredRecipients.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {recipientSearchQuery ? 'No recipients found matching your search' : 'No recipients available'}
                      </p>
                    ) : (
                      filteredRecipients.map(worker => (
                        <div key={worker.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`recipient-${worker.id}`}
                            checked={recipients.includes(worker.id)}
                            onCheckedChange={() => handleRecipientToggle(worker.id)}
                          />
                          <label
                            htmlFor={`recipient-${worker.id}`}
                            className="flex-1 flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <span>{worker.full_name}</span>
                            <Badge variant={getRoleBadgeColor(worker.worker_role)}>
                              {worker.worker_role}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              ({worker.email || 'No email'})
                            </span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedRecipientsList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Selected:</span>
                      {selectedRecipientsList.map(worker => (
                        <Badge key={worker.id} variant="secondary" className="gap-1">
                          {worker.full_name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRecipientToggle(worker.id)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Enter message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                maxLength={200}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Message *</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Enter your message here..."
                disabled={sending}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  disabled={sending}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('attachments')?.click()}
                  disabled={sending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </Button>
                <span className="text-xs text-muted-foreground">Max 10MB per file</span>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate flex-1">{att.file.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(att.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(att.id)}
                          disabled={sending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`${getBasePath()}/inbox`)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};

export default Compose;
