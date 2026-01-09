import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MailOpen, Send, Loader2, Plus, Trash2, Radio, Users, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import CreateGroupDialog from '@/components/messages/CreateGroupDialog';
import { Input } from '@/components/ui/input';

interface MessageWithDetails {
  id: string;
  thread_id: string;
  subject: string;
  content: string;
  sent_at: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  read_at: string | null;
  recipient_id: string;
  recipient_name?: string; // For sent messages
  recipient_role?: string; // For sent messages
  recipient_count?: number; // For multiple recipients
}

type InboxFilter = 'all' | 'unread' | 'sent' | 'groups';

interface GroupWithDetails {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  last_message_at: string | null;
  unread_count: number;
}

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [allMessages, setAllMessages] = useState<MessageWithDetails[]>([]); // Store unfiltered messages
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [allGroups, setAllGroups] = useState<GroupWithDetails[]>([]); // Store unfiltered groups
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Cache for all data fetched on initial load
  const [allMessagesCache, setAllMessagesCache] = useState<MessageWithDetails[]>([]);
  const [unreadMessagesCache, setUnreadMessagesCache] = useState<MessageWithDetails[]>([]);
  const [sentMessagesCache, setSentMessagesCache] = useState<MessageWithDetails[]>([]);
  const [groupsCache, setGroupsCache] = useState<GroupWithDetails[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  // Get base path based on user role
  const getBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Fetch all data once when user is loaded
  useEffect(() => {
    if (currentUserId && !dataFetched) {
      fetchAllData();
    }
  }, [currentUserId, dataFetched]);

  // Display cached data when filter changes (no refetching)
  useEffect(() => {
    if (dataFetched) {
      displayDataForFilter();
    }
  }, [filter, dataFetched]);

  // Filter messages/groups based on search query
  useEffect(() => {
    if (filter === 'groups') {
      if (!searchQuery.trim()) {
        setGroups(allGroups);
      } else {
        const filtered = allGroups.filter((group) =>
          group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setGroups(filtered);
      }
    } else {
      if (!searchQuery.trim()) {
        setMessages(allMessages);
      } else {
        const filtered = allMessages.filter((message) =>
          message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          message.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setMessages(filtered);
      }
    }
  }, [searchQuery, allMessages, allGroups, filter]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil((filter === 'groups' ? groups.length : messages.length) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = messages.slice(startIndex, endIndex);
  const paginatedGroups = groups.slice(startIndex, endIndex);

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

  // Fetch all data in parallel and cache it
  const fetchAllData = async () => {
    if (!currentUserId) return;

    console.log('[Inbox] Fetching all data for userId:', currentUserId);
    setLoading(true);

    try {
      // Fetch all data types in parallel
      const [allMsgs, unreadMsgs, sentMsgs, groupsData] = await Promise.all([
        fetchAllMessagesData(currentUserId),
        fetchUnreadMessagesData(currentUserId),
        fetchSentMessagesData(currentUserId),
        fetchGroupsData(currentUserId)
      ]);

      // Cache all the data
      setAllMessagesCache(allMsgs);
      setUnreadMessagesCache(unreadMsgs);
      setSentMessagesCache(sentMsgs);
      setGroupsCache(groupsData);

      // Mark data as fetched
      setDataFetched(true);

      // Display initial data based on current filter
      console.log('[Inbox] All data cached successfully');
    } catch (error: any) {
      console.error('[Inbox] Error fetching all data:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Display cached data based on current filter
  const displayDataForFilter = () => {
    console.log('[Inbox] Displaying cached data for filter:', filter);

    switch (filter) {
      case 'all':
        setAllMessages(allMessagesCache);
        setMessages(allMessagesCache);
        break;
      case 'unread':
        setAllMessages(unreadMessagesCache);
        setMessages(unreadMessagesCache);
        break;
      case 'sent':
        setAllMessages(sentMessagesCache);
        setMessages(sentMessagesCache);
        break;
      case 'groups':
        setAllGroups(groupsCache);
        setGroups(groupsCache);
        break;
    }
  };

  // Fetch all messages (received + sent)
  const fetchAllMessagesData = async (userId: string): Promise<MessageWithDetails[]> => {
    console.log('[Inbox] Fetching all messages for userId:', userId);
    const allMessages: MessageWithDetails[] = [];

    // Part 1: Fetch received messages
    const { data: recipientRecords, error: recipientError } = await supabase
      .from('message_recipients')
      .select('id, message_id, read_at, recipient_id')
      .eq('recipient_id', userId)
      .is('deleted_at', null);

    if (recipientError) {
      console.error('[Inbox] Recipient records error:', recipientError);
      throw recipientError;
    }

    if (recipientRecords && recipientRecords.length > 0) {
      const messageIds = recipientRecords.map(r => r.message_id);

      const { data: receivedMessagesData, error: receivedError } = await supabase
        .from('messages')
        .select(`
          id,
          thread_id,
          content,
          sent_at,
          sender_id,
          message_threads!inner(subject)
        `)
        .in('id', messageIds)
        .is('deleted_at', null);

      if (receivedError) throw receivedError;

      // FIX: Batch fetch all sender profiles instead of N+1 queries
      const uniqueSenderIds = [...new Set((receivedMessagesData || []).map(msg => msg.sender_id))];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, email')
        .in('id', uniqueSenderIds);

      // Create a lookup map for O(1) access
      const senderProfileMap = new Map(
        (senderProfiles || []).map(profile => [profile.id, profile])
      );

      for (const msg of receivedMessagesData || []) {
        const recipientRecord = recipientRecords.find(r => r.message_id === msg.id);
        const threadInfo = msg.message_threads || {};
        const senderProfile = senderProfileMap.get(msg.sender_id);

        allMessages.push({
          id: msg.id,
          thread_id: msg.thread_id,
          subject: threadInfo.subject || 'No Subject',
          content: msg.content,
          sent_at: msg.sent_at,
          sender_id: msg.sender_id,
          sender_name: senderProfile?.full_name || 'Unknown Sender',
          sender_role: senderProfile?.role || 'unknown',
          read_at: recipientRecord?.read_at || null,
          recipient_id: userId
        });
      }
    }

    // Part 2: Fetch sent messages
    const { data: sentMessagesData, error: sentError } = await supabase
      .from('messages')
      .select(`
        id,
        thread_id,
        content,
        sent_at,
        sender_id,
        message_threads!inner(subject)
      `)
      .eq('sender_id', userId)
      .is('deleted_at', null);

    if (sentError) throw sentError;

    // FIX: Batch fetch all recipients instead of N+1 queries
    const sentMessageIds = (sentMessagesData || []).map(msg => msg.id);
    if (sentMessageIds.length > 0) {
      const { data: allRecipientsData } = await supabase
        .from('message_recipients')
        .select(`
          message_id,
          recipient_id,
          profiles!message_recipients_recipient_id_fkey(full_name, role)
        `)
        .in('message_id', sentMessageIds);

      // Group recipients by message_id
      const recipientsByMessageId = new Map<string, Array<{ id: string; name: string; role: string }>>();

      for (const recipientData of allRecipientsData || []) {
        const recipient = {
          id: recipientData.recipient_id,
          name: (recipientData.profiles as any)?.full_name || 'Unknown',
          role: (recipientData.profiles as any)?.role || 'unknown'
        };

        if (!recipientsByMessageId.has(recipientData.message_id)) {
          recipientsByMessageId.set(recipientData.message_id, []);
        }
        recipientsByMessageId.get(recipientData.message_id)!.push(recipient);
      }

      // Build message objects
      for (const msg of sentMessagesData || []) {
        const recipients = recipientsByMessageId.get(msg.id) || [];

        if (recipients.length === 0) continue;

        const firstRecipient = recipients[0];
        const threadInfo = msg.message_threads || {};

        allMessages.push({
          id: msg.id,
          thread_id: msg.thread_id,
          subject: threadInfo.subject || 'No Subject',
          content: msg.content,
          sent_at: msg.sent_at,
          sender_id: msg.sender_id,
          sender_name: 'You',
          sender_role: 'sender',
          read_at: null,
          recipient_id: firstRecipient.id,
          recipient_name: firstRecipient.name,
          recipient_role: firstRecipient.role,
          recipient_count: recipients.length
        });
      }
    }

    // Sort by sent_at (most recent first)
    allMessages.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

    console.log('[Inbox] All messages fetched, count:', allMessages.length);
    return allMessages;
  };

  // Fetch unread messages only
  const fetchUnreadMessagesData = async (userId: string): Promise<MessageWithDetails[]> => {
    console.log('[Inbox] Fetching unread messages for userId:', userId);

    const { data: recipientRecords, error: recipientError } = await supabase
      .from('message_recipients')
      .select('id, message_id, read_at, recipient_id')
      .eq('recipient_id', userId)
      .is('read_at', null)
      .is('deleted_at', null);

    if (recipientError) throw recipientError;

    if (!recipientRecords || recipientRecords.length === 0) {
      return [];
    }

    const messageIds = recipientRecords.map(r => r.message_id);

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        thread_id,
        content,
        sent_at,
        sender_id,
        message_threads!inner(subject)
      `)
      .in('id', messageIds)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    const formattedData: MessageWithDetails[] = [];

    // FIX: Batch fetch all sender profiles instead of N+1 queries
    const uniqueSenderIds = [...new Set((messagesData || []).map(msg => msg.sender_id))];
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .in('id', uniqueSenderIds);

    // Create a lookup map for O(1) access
    const senderProfileMap = new Map(
      (senderProfiles || []).map(profile => [profile.id, profile])
    );

    for (const msg of messagesData || []) {
      const recipientRecord = recipientRecords.find(r => r.message_id === msg.id);
      const threadInfo = msg.message_threads || {};
      const senderProfile = senderProfileMap.get(msg.sender_id);

      formattedData.push({
        id: msg.id,
        thread_id: msg.thread_id,
        subject: threadInfo.subject || 'No Subject',
        content: msg.content,
        sent_at: msg.sent_at,
        sender_id: msg.sender_id,
        sender_name: senderProfile?.full_name || 'Unknown Sender',
        sender_role: senderProfile?.role || 'unknown',
        read_at: recipientRecord?.read_at || null,
        recipient_id: userId
      });
    }

    console.log('[Inbox] Unread messages fetched, count:', formattedData.length);
    return formattedData;
  };

  // Fetch sent messages only
  const fetchSentMessagesData = async (userId: string): Promise<MessageWithDetails[]> => {
    console.log('[Inbox] Fetching sent messages for userId:', userId);

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        thread_id,
        content,
        sent_at,
        sender_id,
        message_threads!inner(subject)
      `)
      .eq('sender_id', userId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    const formattedData: MessageWithDetails[] = [];

    // FIX: Batch fetch all recipients instead of N+1 queries
    const messageIds = (messagesData || []).map(msg => msg.id);
    if (messageIds.length > 0) {
      const { data: allRecipientsData } = await supabase
        .from('message_recipients')
        .select(`
          message_id,
          recipient_id,
          profiles!message_recipients_recipient_id_fkey(full_name, role)
        `)
        .in('message_id', messageIds);

      // Group recipients by message_id
      const recipientsByMessageId = new Map<string, Array<{ id: string; name: string; role: string }>>();

      for (const recipientData of allRecipientsData || []) {
        const recipient = {
          id: recipientData.recipient_id,
          name: (recipientData.profiles as any)?.full_name || 'Unknown',
          role: (recipientData.profiles as any)?.role || 'unknown'
        };

        if (!recipientsByMessageId.has(recipientData.message_id)) {
          recipientsByMessageId.set(recipientData.message_id, []);
        }
        recipientsByMessageId.get(recipientData.message_id)!.push(recipient);
      }

      // Build message objects
      for (const msg of messagesData || []) {
        const recipients = recipientsByMessageId.get(msg.id) || [];

        if (recipients.length === 0) continue;

        const firstRecipient = recipients[0];
        const threadInfo = msg.message_threads || {};

        formattedData.push({
          id: msg.id,
          thread_id: msg.thread_id,
          subject: threadInfo.subject || 'No Subject',
          content: msg.content,
          sent_at: msg.sent_at,
          sender_id: msg.sender_id,
          sender_name: 'You',
          sender_role: 'sender',
          read_at: null,
          recipient_id: firstRecipient.id,
          recipient_name: firstRecipient.name,
          recipient_role: firstRecipient.role,
          recipient_count: recipients.length
        });
      }
    }

    console.log('[Inbox] Sent messages fetched, count:', formattedData.length);
    return formattedData;
  };

  // Fetch groups data
  const fetchGroupsData = async (userId: string): Promise<GroupWithDetails[]> => {
    console.log('[Inbox] Fetching groups for userId:', userId);

    const { data: groupsData, error } = await supabase
      .from('message_groups')
      .select(`
        id,
        name,
        description,
        group_members!inner(user_id)
      `)
      .eq('group_members.user_id', userId)
      .eq('group_type', 'conversation')
      .is('group_members.left_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formattedGroups: GroupWithDetails[] = [];
    const groupIds = (groupsData || []).map(g => g.id);

    if (groupIds.length > 0) {
      // FIX: Batch fetch member counts instead of N+1 queries
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)
        .is('left_at', null);

      // Count members per group
      const memberCountMap = new Map<string, number>();
      for (const member of memberCounts || []) {
        memberCountMap.set(member.group_id, (memberCountMap.get(member.group_id) || 0) + 1);
      }

      // FIX: Batch fetch last messages instead of N+1 queries
      const { data: allMessages } = await supabase
        .from('messages')
        .select('group_id, sent_at')
        .in('group_id', groupIds)
        .order('sent_at', { ascending: false });

      // Find most recent message per group
      const lastMessageMap = new Map<string, string>();
      for (const message of allMessages || []) {
        if (!lastMessageMap.has(message.group_id)) {
          lastMessageMap.set(message.group_id, message.sent_at);
        }
      }

      // Build group objects
      for (const group of groupsData || []) {
        formattedGroups.push({
          id: group.id,
          name: group.name,
          description: group.description,
          member_count: memberCountMap.get(group.id) || 0,
          last_message_at: lastMessageMap.get(group.id) || null,
          unread_count: 0,
        });
      }
    }

    console.log('[Inbox] Groups fetched, count:', formattedGroups.length);
    return formattedGroups;
  };

  const handleMessageClick = (threadId: string, messageId: string, readAt: string | null) => {
    // Mark as read if unread (will be handled in Thread view)
    navigate(`${getBasePath()}/thread/${threadId}`);
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`${getBasePath()}/group/${groupId}`);
  };

  const handleGroupCreated = (groupId: string) => {
    // Invalidate cache and refetch all data
    setDataFetched(false);
    // Navigate to the new group
    navigate(`${getBasePath()}/group/${groupId}`);
  };

  const handleDeleteMessage = async (e: React.MouseEvent, messageId: string, isSentMessage: boolean) => {
    // Prevent triggering the card's onClick
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      if (!currentUserId) {
        toast.error('User not authenticated');
        return;
      }

      if (isSentMessage) {
        // For sent messages, soft delete the message itself (sender's view)
        const { error } = await supabase
          .from('messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', messageId)
          .eq('sender_id', currentUserId);

        if (error) throw error;
      } else {
        // For received messages, soft delete the message_recipient record
        const { error } = await supabase
          .from('message_recipients')
          .update({ deleted_at: new Date().toISOString() })
          .eq('message_id', messageId)
          .eq('recipient_id', currentUserId);

        if (error) throw error;
      }

      toast.success('Message deleted');

      // Invalidate cache and refetch all data
      setDataFetched(false);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete message');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'root':
        return 'destructive';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">View and manage your messages</p>
        </div>
        <div className="flex gap-2">
          {/* Only managers, admins, and root can create groups */}
          {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'root' || user?.role === 'team_lead') && (
            <Button variant="outline" onClick={() => setShowCreateGroupDialog(true)}>
              <Users className="mr-2 h-4 w-4" />
              New Group
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'root') && (
            <Button variant="outline" onClick={() => navigate(`${getBasePath()}/broadcast`)}>
              <Radio className="mr-2 h-4 w-4" />
              Broadcast
            </Button>
          )}
          <Button onClick={() => navigate(`${getBasePath()}/compose`)}>
            <Plus className="mr-2 h-4 w-4" />
            Compose Message
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={filter === 'groups' ? 'Search groups...' : 'Search messages by subject, content, or sender...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs for filtering */}
      <Tabs value={filter} onValueChange={(value) => { setFilter(value as InboxFilter); setSearchQuery(''); }}>
        <TabsList>
          <TabsTrigger value="all">
            <Mail className="mr-2 h-4 w-4" />
            All Messages
          </TabsTrigger>
          <TabsTrigger value="unread">
            <MailOpen className="mr-2 h-4 w-4" />
            Unread
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="mr-2 h-4 w-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filter === 'groups' ? (
            // Groups view
            groups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No groups yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a group to start chatting with your team
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowCreateGroupDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedGroups.map((group) => (
                  <Card
                    key={group.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-base">{group.name}</h3>
                          </div>
                          {group.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary">
                              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                            </Badge>
                            {group.last_message_at && (
                              <span>
                                Last message {formatDistanceToNow(new Date(group.last_message_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>

                {/* Pagination for Groups */}
                {groups.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({groups.length} groups)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )
          ) : messages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No messages</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'sent'
                    ? "You haven't sent any messages yet"
                    : filter === 'unread'
                    ? 'You have no unread messages'
                    : 'Your inbox is empty'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedMessages.map((message) => (
                <Card
                  key={message.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleMessageClick(message.thread_id, message.id, message.read_at)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {!message.read_at && filter !== 'sent' && message.sender_id !== currentUserId && (
                            <Badge variant="default" className="h-5">
                              New
                            </Badge>
                          )}
                          <h3 className="font-semibold text-base">{message.subject}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {filter === 'sent' ? (
                            <>
                              <span>To: {message.recipient_name || 'Unknown'}</span>
                              <Badge variant={getRoleBadgeColor(message.recipient_role || 'unknown')}>
                                {message.recipient_role || 'unknown'}
                              </Badge>
                              {message.recipient_count && message.recipient_count > 1 && (
                                <Badge variant="secondary">
                                  +{message.recipient_count - 1} more
                                </Badge>
                              )}
                            </>
                          ) : (
                            <>
                              <span>From: {message.sender_name}</span>
                              <Badge variant={getRoleBadgeColor(message.sender_role)}>
                                {message.sender_role}
                              </Badge>
                            </>
                          )}
                        </div>
                        <div
                          className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteMessage(e, message.id, filter === 'sent')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>

              {/* Pagination for Messages */}
              {messages.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({messages.length} messages)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Inbox;
