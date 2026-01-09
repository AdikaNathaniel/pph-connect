import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Download, FileIcon, CheckCheck, Clock, Send, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/messaging/RichTextEditor';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageThread {
  id: string;
  subject: string;
  created_by: string;
  created_at: string;
}

interface AttachmentMetadata {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface MessageDetails {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  sent_at: string;
  attachments: AttachmentMetadata[];
  read_receipts: {
    recipient_id: string;
    recipient_name: string;
    read_at: string | null;
  }[];
}

const Thread: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<MessageDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagesLimit, setMessagesLimit] = useState(50);

  // Get base path based on user role
  const getBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  useEffect(() => {
    if (threadId) {
      fetchCurrentUserAndThread();
    }
  }, [threadId]);

  const fetchCurrentUserAndThread = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to view messages');
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);
      await Promise.all([fetchThread(), fetchMessages(user.id, false)]);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!currentUserId) return;
    await fetchMessages(currentUserId, true);
  };

  const fetchThread = async () => {
    if (!threadId) return;

    const { data, error } = await supabase
      .from('message_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) throw error;

    setThread(data);
  };

  const fetchMessages = async (userId: string, loadMore = false) => {
    if (!threadId) return;

    if (loadMore) setLoadingMore(true);

    const limit = loadMore ? messagesLimit + 50 : messagesLimit;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        thread_id,
        sender_id,
        content,
        sent_at,
        attachments,
        profiles!messages_sender_id_fkey(full_name, role),
        message_recipients(
          recipient_id,
          read_at,
          profiles!message_recipients_recipient_id_fkey(full_name)
        )
      `)
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Check if there are more messages
    setShowLoadMore((data || []).length === limit);

    const formattedMessages: MessageDetails[] = (data || []).map((msg: any) => ({
      id: msg.id,
      thread_id: msg.thread_id,
      sender_id: msg.sender_id,
      sender_name: msg.profiles.full_name || 'Unknown',
      sender_role: msg.profiles.role,
      content: msg.content,
      sent_at: msg.sent_at,
      attachments: msg.attachments || [],
      read_receipts: msg.message_recipients.map((mr: any) => ({
        recipient_id: mr.recipient_id,
        recipient_name: mr.profiles.full_name || 'Unknown',
        read_at: mr.read_at
      }))
    }));

    // Reverse to show oldest first
    formattedMessages.reverse();
    setMessages(formattedMessages);

    if (loadMore) {
      setMessagesLimit(limit);
      setLoadingMore(false);
    }

    // Mark unread messages as read
    await markMessagesAsRead(userId, formattedMessages);
  };

  const markMessagesAsRead = async (userId: string, messages: MessageDetails[]) => {
    // Find messages where current user is recipient and hasn't read yet
    const unreadMessageIds = messages
      .filter(msg =>
        msg.read_receipts.some(
          receipt => receipt.recipient_id === userId && !receipt.read_at
        )
      )
      .map(msg => msg.id);

    if (unreadMessageIds.length === 0) return;

    try {
      await supabase
        .from('message_recipients')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .in('message_id', unreadMessageIds)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const downloadAttachment = async (attachment: AttachmentMetadata) => {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .download(attachment.path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Attachment downloaded');
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (!threadId || !currentUserId) {
      toast.error('Unable to send reply');
      return;
    }

    setReplying(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to send a reply');
        return;
      }

      // Get all unique recipient IDs from the thread (excluding current user)
      const allRecipientIds = new Set<string>();
      messages.forEach(msg => {
        // Add original sender if not current user
        if (msg.sender_id !== currentUserId) {
          allRecipientIds.add(msg.sender_id);
        }
        // Add all recipients if not current user
        msg.read_receipts.forEach(receipt => {
          if (receipt.recipient_id !== currentUserId) {
            allRecipientIds.add(receipt.recipient_id);
          }
        });
      });

      const recipientIds = Array.from(allRecipientIds);

      if (recipientIds.length === 0) {
        toast.error('No recipients found');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
            recipient_ids: recipientIds,
            subject: thread?.subject || 'Re: Message',
            content: replyContent,
            thread_id: threadId,
            attachments: []
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reply');
      }

      toast.success('Reply sent successfully');
      setReplyContent('');

      // Refresh messages to show the new reply
      if (currentUserId) {
        await fetchMessages(currentUserId);
      }
    } catch (error: any) {
      console.error('Reply error:', error);
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Thread not found</p>
          <Button className="mt-4" onClick={() => navigate(`${getBasePath()}/inbox`)}>
            Back to Inbox
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${getBasePath()}/inbox`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{thread.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Started {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
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

        {messages.map((message, index) => {
          const isOwnMessage = message.sender_id === currentUserId;
          const readCount = message.read_receipts.filter(r => r.read_at).length;
          const totalRecipients = message.read_receipts.length;

          return (
            <Card
              key={message.id}
              className={cn(
                'transition-all',
                isOwnMessage && 'border-primary/20 bg-primary/5'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{message.sender_name}</span>
                    <Badge variant={getRoleBadgeColor(message.sender_role)}>
                      {message.sender_role}
                    </Badge>
                    {isOwnMessage && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(message.sent_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="text-sm prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />

                {/* Attachments */}
                {message.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachments:</p>
                      <div className="space-y-2">
                        {message.attachments.map((attachment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => downloadAttachment(attachment)}
                          >
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{attachment.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </span>
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Read Receipts */}
                {isOwnMessage && message.read_receipts.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {readCount === totalRecipients ? (
                          <>
                            <CheckCheck className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              Read by all ({readCount}/{totalRecipients})
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Read by {readCount}/{totalRecipients}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {message.read_receipts.map((receipt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span>{receipt.recipient_name}:</span>
                            {receipt.read_at ? (
                              <span className="text-green-600">
                                Read {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
                              </span>
                            ) : (
                              <span>Unread</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reply Form */}
      <Card>
        <CardHeader>
          <CardTitle>Reply to Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextEditor
            content={replyContent}
            onChange={setReplyContent}
            placeholder="Type your reply..."
            disabled={replying}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setReplyContent('')}
              disabled={replying || !replyContent.trim()}
            >
              Clear
            </Button>
            <Button
              onClick={handleReply}
              disabled={replying || !replyContent.trim()}
            >
              {replying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Thread;
