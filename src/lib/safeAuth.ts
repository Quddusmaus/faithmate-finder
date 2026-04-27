import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;

  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
      const session = parsed?.currentSession ?? parsed?.session ?? parsed;

      if (!session?.access_token || !session?.user) continue;
      if (session.expires_at && session.expires_at * 1000 < Date.now() - 30_000) {
        continue;
      }

      return session as Session;
    } catch {
      // Ignore malformed auth storage from older sessions.
    }
  }

  return null;
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function getSessionWithTimeout(ms = 5000): Promise<Session | null> {
  const storedSession = getStoredSession();
  if (storedSession) return storedSession;

  try {
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      ms,
      "Session check timed out",
    );
    return data?.session ?? getStoredSession();
  } catch {
    return getStoredSession();
  }
}

export async function getUserWithTimeout(ms = 5000): Promise<User | null> {
  // Always prefer the locally-stored session. getUser() hits the network and
  // is what was timing out behind the preview proxy.
  const session = await getSessionWithTimeout(Math.min(ms, 3000));
  if (session?.user) {
    return session.user;
  }

  try {
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      ms,
      "Authentication check timed out",
    );
    return data?.user ?? null;
  } catch {
    return null;
  }
}
