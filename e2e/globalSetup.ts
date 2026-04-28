/**
 * Playwright globalSetup — runs once before all tests.
 *
 * Creates two pre-confirmed test users (User A and User B) via the Supabase
 * service-role Admin API so no email-confirmation step is needed.
 * Writes their credentials to /tmp/e2e-users.json for tests to consume.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL          — already present in .env
 *   SUPABASE_SERVICE_ROLE_KEY  — set in your shell / CI secrets (never committed)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import os from "os";
import path from "path";

export const USERS_FILE = path.join(os.tmpdir(), "e2e-users.json");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface TestUsers {
  userA: TestUser;
  userB: TestUser;
}

function makeEmail(tag: string): string {
  return `e2e_${tag}_${Date.now()}@mailinator.com`;
}

const PASSWORD = "Test1234!";

async function createConfirmedUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  tag: string,
): Promise<TestUser> {
  const { data, error } = await (admin.auth as any).admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${tag}` },
  });
  if (error) throw new Error(`Failed to create ${tag}: ${error.message}`);
  return { id: data.user.id, email, password: PASSWORD };
}

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log(
      "\n[globalSetup] SUPABASE_SERVICE_ROLE_KEY not set — skipping pre-confirmed user creation.\n" +
        "  Tests that call readTestUsers() will throw. Set the key to enable this feature.",
    );
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [userA, userB] = await Promise.all([
    createConfirmedUser(admin, makeEmail("userA"), "User A"),
    createConfirmedUser(admin, makeEmail("userB"), "User B"),
  ]);

  const users: TestUsers = { userA, userB };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  console.log(`\n[globalSetup] Created test users → ${USERS_FILE}`);
  console.log(`  User A: ${userA.email}`);
  console.log(`  User B: ${userB.email}`);
}
