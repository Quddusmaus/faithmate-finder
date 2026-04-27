import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { getSessionWithTimeout } from '@/lib/safeAuth';

export const useLanguagePreference = () => {
  const { i18n } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state and load language preference
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id ?? null);
        
        if (session?.user?.id) {
          // Defer the database call to avoid deadlock
          setTimeout(() => {
            loadLanguagePreference(session.user.id);
          }, 0);
        } else {
          setIsLoading(false);
        }
      }
    );

    getSessionWithTimeout(3000).then((session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) {
        loadLanguagePreference(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadLanguagePreference = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        console.error('Error loading language preference:', error);
        return;
      }

      if (data?.preferred_language) {
        i18n.changeLanguage(data.preferred_language);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLanguagePreference = async (languageCode: string) => {
    // Always change the language locally
    i18n.changeLanguage(languageCode);

    // If user is logged in, save to database
    if (userId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: languageCode })
          .eq('user_id', userId);

        if (error) {
          console.error('Error saving language preference:', error);
        }
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  return {
    saveLanguagePreference,
    isLoading,
    isLoggedIn: !!userId,
  };
};
