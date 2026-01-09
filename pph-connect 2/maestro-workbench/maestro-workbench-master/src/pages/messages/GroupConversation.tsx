import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Users, Send, Loader2, Info, Paperclip, Download, Upload, X, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/messaging/RichTextEditor';
import { formatDistanceToNow } from 'date-fns';

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  member_count: number;
}

interface Message {
  id: string;
  content: string;
  sent_at: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  attachments: Array<{
    path: string;
    name: string;
    size: number;
    type: string;
  }>;
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

const GroupConversation: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagesLimit, setMessagesLimit] = useState(50);

  const getMessagesBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  const getInboxPath = () => {
    return user?.role === 'worker' ? '/w/messages/inbox' : '/m/messages/inbox';
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (groupId && currentUserId) {
      fetchGroupDetails();
      fetchMessages();
    }
  }, [groupId, currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Failed to authenticate');
    }
  };

  const fetchGroupDetails = async () => {
    if (!groupId) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('message_groups')
        .select('id, name, description, avatar_url, created_by')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Get member count
      const { count, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .is('left_at', null);

      if (countError) throw countError;

      setGroup({
        ...groupData,
        member_count: count || 0,
      });
    } catch (error: any) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group details');
    }
  };

  const fetchMessages = async (loadMore = false) => {
    if (!groupId) return;

    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const limit = loadMore ? messagesLimit + 50 : messagesLimit;

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sent_at,
          sender_id,
          attachments,
          profiles!messages_sender_id_fkey(full_name, role)
        `)
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Check if there are more messages
      setShowLoadMore((messagesData || []).length === limit);

      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sent_at: msg.sent_at,
        sender_id: msg.sender_id,
        sender_name: msg.profiles?.full_name || 'Unknown',
        sender_role: msg.profiles?.role || 'unknown',
        attachments: msg.attachments || [],
      }));

      // Reverse to show oldest first
      formattedMessages.reverse();
      setMessages(formattedMessages);

      if (loadMore) {
        setMessagesLimit(limit);
      }

      // Mark group as read by updating last_read_at
      if (currentUserId) {
        await markGroupAsRead();
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchMessages(true);
  };

  const markGroupAsRead = async () => {
    if (!groupId || !currentUserId) return;

    try {
      // Update last_read_at to current timestamp
      await supabase
        .from('group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', currentUserId);
    } catch (error) {
      console.error('Error marking group as read:', error);
      // Don't show error to user, this is a background operation
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentFile[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substring(7)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const uploadAttachments = async (): Promise<UploadedAttachment[]> => {
    if (attachments.length === 0) return [];

    setUploading(true);
    const uploadedFiles: UploadedAttachment[] = [];

    try {
      for (const attachment of attachments) {
        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, attachment.file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          path: filePath,
          name: attachment.file.name,
          size: attachment.file.size,
          type: attachment.file.type
        });
      }

      return uploadedFiles;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload attachments');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() && attachments.length === 0) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!groupId) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload attachments first
      const uploadedAttachments = await uploadAttachments();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            group_id: groupId,
            subject: group?.name || 'Group Message',
            content: messageContent || '(attachment)',
            attachments: uploadedAttachments
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast.success('Message sent');
      setMessageContent('');
      setAttachments([]);
      await fetchMessages(); // This will also mark group as read
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(attachment.path);

    window.open(data.publicUrl, '_blank');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'root':
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'team_lead':
        return 'secondary';
      case 'worker':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading && !group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(getInboxPath())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Messages
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Group not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(getInboxPath())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`${getMessagesBasePath()}/group/${groupId}/info`)}
        >
          <Info className="mr-2 h-4 w-4" />
          Group Info
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Load More Button */}
          {showLoadMore && !loading && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading older messages...
                  </>
                ) : (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Load older messages
                  </>
                )}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No messages yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to send a message to this group
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] ${
                    message.sender_id === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } rounded-lg p-4 space-y-2`}
                >
                  {message.sender_id !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{message.sender_name}</p>
                      <Badge variant={getRoleBadgeColor(message.sender_role)} className="text-xs">
                        {message.sender_role}
                      </Badge>
                    </div>
                  )}
                  <div
                    className="text-sm prose prose-sm max-w-none dark:prose-invert break-words"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {message.attachments.map((attachment, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          <Paperclip className="mr-2 h-3 w-3" />
                          <span className="truncate">{attachment.name}</span>
                          <Download className="ml-auto h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs opacity-70">
                    {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <Badge key={attachment.id} variant="secondary" className="gap-2">
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{attachment.file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="self-end"
              disabled={sending || uploading}
              onClick={() => document.getElementById('group-file-input')?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              id="group-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <RichTextEditor
              content={messageContent}
              onChange={setMessageContent}
              placeholder="Type your message..."
              disabled={sending || uploading}
              className="flex-1"
              collapsible={true}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || uploading || (!messageContent.trim() && attachments.length === 0)}
              className="self-end"
            >
              {sending || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line. Click upload button to attach files.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GroupConversation;
