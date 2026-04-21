import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function timeoutPromise(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([promise, timeoutPromise(ms, message)]);
}

export async function getUserWithTimeout(ms = 5000): Promise<User | null> {
  const { data, error } = await withTimeout(
    supabase.auth.getUser(),
    ms,
    "Authentication check timed out",
  );

  if (error) {
    throw error;
  }

  return data.user ?? null;
}

export async function getSessionWithTimeout(ms = 5000): Promise<Session | null> {
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    ms,
    "Session check timed out",
  );

  if (error) {
    throw error;
  }

  return data.session ?? null;
}
