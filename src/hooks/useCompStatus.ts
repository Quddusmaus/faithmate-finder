import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCompStatus() {
  const [isComped, setIsComped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setIsComped(false);
            setIsLoading(false);
          }
          return;
        }
        const { data, error } = await supabase
          .from('comped_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('Comp status check failed:', error);
          setIsComped(false);
        } else {
          setIsComped(!!data);
        }
      } catch (e) {
        if (!cancelled) setIsComped(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { isComped, isLoading };
}
