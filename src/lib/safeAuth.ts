import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function timeoutPromise(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    timeoutPromise(ms, message),
  ]) as Promise<T>;
}

export async function getSessionWithTimeout(ms = 5000): Promise<Session | null> {
  try {
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      ms,
      "Session check timed out",
    );
    return data?.session ?? null;
  } catch {
    // getSession() reads from local storage; if it stalls, treat as no session
    // rather than throwing — prevents false "session issue" flags in slow proxies.
    return null;
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
