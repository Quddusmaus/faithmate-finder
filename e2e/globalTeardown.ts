/**
 * Playwright globalTeardown — runs once after all tests complete.
 *
 * Reads the users written by globalSetup and deletes them via the Admin API,
 * then removes the temp credentials file.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { USERS_FILE, TestUsers } from "./globalSetup";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export default async function globalTeardown() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log("[globalTeardown] No users file found — skipping cleanup.");
    return;
  }

  const users: TestUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[globalTeardown] Missing env vars — deleting credentials file only.");
    fs.unlinkSync(USERS_FILE);
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const [tag, user] of Object.entries(users)) {
    const { error } = await (admin.auth as any).admin.deleteUser(user.id);
    if (error) {
      console.warn(`[globalTeardown] Could not delete ${tag} (${user.id}): ${error.message}`);
    } else {
      console.log(`[globalTeardown] Deleted ${tag}: ${user.email}`);
    }
  }

  fs.unlinkSync(USERS_FILE);
}
