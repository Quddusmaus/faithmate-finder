import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom hook for tracking unread message count with real-time updates.
 * This provides a durable solution that:
 * 1. Fetches initial count on mount
 * 2. Subscribes to real-time message changes
 * 3. Recalculates when messages are inserted or updated (marked as read)
 */
export const useUnreadMessageCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async (uid: string) => {
    try {
      console.log('useUnreadMessageCount: Fetching for user', uid);
      
      const { data, error } = await supabase.rpc('get_user_matches', {
        user_uuid: uid
      });

      if (error) {
        console.error('useUnreadMessageCount: Error fetching matches', error);
        setUnreadCount(0);
        return;
      }

      // Handle BigInt conversion properly - unread_count comes as bigint from Postgres
      const totalUnread = (data || []).reduce(
        (sum: number, match: any) => {
          // Convert to number, handling potential BigInt or string values
          const count = parseInt(String(match.unread_count || 0), 10);
          return sum + (isNaN(count) ? 0 : count);
        }, 
        0
      );
      
      console.log('useUnreadMessageCount: Total unread =', totalUnread, 'from matches:', data?.map((m: any) => ({ 
        name: m.name, 
        unread: m.unread_count,
        parsed: parseInt(String(m.unread_count || 0), 10)
      })));
      
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('useUnreadMessageCount: Exception', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!mounted) return;
      
      if (!user) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await fetchUnreadCount(user.id);

      // Subscribe to real-time message changes
      // This will trigger on new messages (INSERT) and when messages are read (UPDATE)
      channel = supabase
        .channel('unread-messages-count')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT and UPDATE
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            console.log('useUnreadMessageCount: Message change detected', payload.eventType);
            // Refetch count when any message changes
            if (user.id) {
              fetchUnreadCount(user.id);
            }
          }
        )
        .subscribe((status) => {
          console.log('useUnreadMessageCount: Subscription status', status);
        });
    };

    initialize();

    // Also listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUserId(session.user.id);
        fetchUnreadCount(session.user.id);
      } else {
        setUserId(null);
        setUnreadCount(0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchUnreadCount]);

  // Provide a manual refresh function
  const refresh = useCallback(() => {
    if (userId) {
      fetchUnreadCount(userId);
    }
  }, [userId, fetchUnreadCount]);

  return { unreadCount, loading, refresh };
};
