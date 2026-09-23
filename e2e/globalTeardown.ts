/**
 * Playwright globalTeardown — runs once after all tests complete.
 *
 * Deletes the users written by globalSetup plus every user specs created via
 * createTestUser() (EXTRA_USERS_FILE), then removes the temp credentials files.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { USERS_FILE, EXTRA_USERS_FILE, TestUsers } from "./globalSetup";

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\s/g, "");
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s/g, "");

export default async function globalTeardown() {
  const users: TestUsers | null = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"))
    : null;
  const extraIds = fs.existsSync(EXTRA_USERS_FILE)
    ? [...new Set(fs.readFileSync(EXTRA_USERS_FILE, "utf-8").split("\n").filter(Boolean))]
    : [];

  if (!users && extraIds.length === 0) {
    console.log("[globalTeardown] No users to clean up.");
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[globalTeardown] Missing env vars — deleting credentials files only.");
  } else {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Remove comped access before deleting the auth user (FK constraint)
    if (users?.userA) {
      await admin.from("comped_users").delete().eq("user_id", users.userA.id);
    }

    for (const [tag, user] of Object.entries(users ?? {})) {
      const { error } = await (admin.auth as any).admin.deleteUser(user.id);
      if (error) {
        console.warn(`[globalTeardown] Could not delete ${tag} (${user.id}): ${error.message}`);
      } else {
        console.log(`[globalTeardown] Deleted ${tag}: ${user.email}`);
      }
    }

    let deleted = 0;
    for (const id of extraIds) {
      const { error } = await (admin.auth as any).admin.deleteUser(id);
      if (error) console.warn(`[globalTeardown] Could not delete spec user ${id}: ${error.message}`);
      else deleted++;
    }
    if (extraIds.length) console.log(`[globalTeardown] Deleted ${deleted}/${extraIds.length} spec-created users`);
  }

  if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE);
  if (fs.existsSync(EXTRA_USERS_FILE)) fs.unlinkSync(EXTRA_USERS_FILE);
}
