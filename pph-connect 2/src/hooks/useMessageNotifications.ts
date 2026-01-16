import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UseMessageNotificationsReturn {
  unreadCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
}

/**
 * Custom hook to manage message notifications and unread count
 *
 * Features:
 * - Fetches unread message count on mount
 * - Provides refresh function to manually update count
 * - Optional: Can be extended with real-time subscriptions
 *
 * Usage:
 * const { unreadCount, loading, refreshUnreadCount } = useMessageNotifications();
 */
export const useMessageNotifications = (): UseMessageNotificationsReturn => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUnreadCount(0);
        return;
      }

      // Count unread direct messages
      const { count: directCount, error: directError } = await supabase
        .from('message_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .is('deleted_at', null);

      if (directError) {
        console.error('Error fetching unread direct messages count:', directError);
      }

      // Count unread group messages
      // Get all groups the user is a member of with their last_read_at timestamp
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id, joined_at, last_read_at')
        .eq('user_id', user.id)
        .is('left_at', null);

      let groupMessageCount = 0;

      if (!membershipError && memberships && memberships.length > 0) {
        // For each group, count messages sent after the user last read the group
        // that weren't sent by the user themselves
        for (const membership of memberships) {
          // Count from last_read_at, or joined_at if they've never read
          const countFrom = membership.last_read_at || membership.joined_at;

          const { count: groupCount, error: groupError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', membership.group_id)
            .neq('sender_id', user.id)  // Exclude own messages
            .gt('sent_at', countFrom)  // Only messages AFTER last read (use gt instead of gte to exclude the exact timestamp)
            .is('deleted_at', null);

          if (!groupError && groupCount) {
            groupMessageCount += groupCount;
          }
        }
      }

      // Total unread count = direct messages + group messages
      const totalCount = (directCount || 0) + groupMessageCount;
      setUnreadCount(totalCount);

    } catch (error) {
      console.error('Error in fetchUnreadCount:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshUnreadCount = async () => {
    await fetchUnreadCount();
  };

  useEffect(() => {
    fetchUnreadCount();

    // Optional: Set up real-time subscription for new messages
    // Uncomment the code below to enable real-time notifications

    /*
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('message-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_recipients',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            // New message received, increment count
            setUnreadCount(prev => prev + 1);
            // Optional: Show toast notification
            // toast.info('New message received');
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'message_recipients',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            // Message marked as read, refresh count
            refreshUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
    */

    // Refresh count every 60 seconds
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    unreadCount,
    loading,
    refreshUnreadCount
  };
};
