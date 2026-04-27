import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserWithTimeout } from '@/lib/safeAuth';

export const useBlockUser = () => {
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  const blockUser = async (blockedUserId: string, blockedUserName: string) => {
    setIsBlocking(true);
    try {
      const user = await getUserWithTimeout(5000);
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to block users.',
          variant: 'destructive',
        });
        return false;
      }

      // Insert block record
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: blockedUserId });

      if (blockError) {
        if (blockError.code === '23505') {
          toast({
            title: 'Already blocked',
            description: `${blockedUserName} is already blocked.`,
          });
          return false;
        }
        throw blockError;
      }

      // Delete any existing likes between users
      await supabase
        .from('likes')
        .delete()
        .or(`and(user_id.eq.${user.id},liked_user_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},liked_user_id.eq.${user.id})`);

      toast({
        title: 'User blocked',
        description: `${blockedUserName} has been blocked. They won't be able to see your profile or message you.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to block user.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsBlocking(false);
    }
  };

  const unblockUser = async (blockedUserId: string, blockedUserName: string) => {
    setIsBlocking(true);
    try {
      const user = await getUserWithTimeout(5000);
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to unblock users.',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast({
        title: 'User unblocked',
        description: `${blockedUserName} has been unblocked.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unblock user.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsBlocking(false);
    }
  };

  const unmatch = async (matchedUserId: string, matchedUserName: string) => {
    setIsBlocking(true);
    try {
      const user = await getUserWithTimeout(5000);
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to unmatch.',
          variant: 'destructive',
        });
        return false;
      }

      // Delete likes in both directions
      const { error } = await supabase
        .from('likes')
        .delete()
        .or(`and(user_id.eq.${user.id},liked_user_id.eq.${matchedUserId}),and(user_id.eq.${matchedUserId},liked_user_id.eq.${user.id})`);

      if (error) throw error;

      toast({
        title: 'Unmatched',
        description: `You've unmatched with ${matchedUserName}.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error unmatching:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unmatch.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsBlocking(false);
    }
  };

  return { blockUser, unblockUser, unmatch, isBlocking };
};
