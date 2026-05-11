/**
 * RLS (Row-Level Security) isolation tests.
 *
 * Verifies that Supabase RLS policies prevent cross-user data access.
 * Uses the service-role key to seed data and user-level JWT clients to
 * assert isolation — no browser required.
 *
 * Required env vars (same as globalSetup):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * Note: globalSetup creates profiles for userA and userB, which satisfies
 * the messages.sender_id -> profiles foreign key constraint.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readTestUsers } from "./helpers/auth";

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? "").replace(/\s/g, "");
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(
  /\s/g,
  "",
);
const ANON_KEY = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""
).replace(/\s/g, "");

test.describe("RLS — cross-user data isolation", () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY,
    "Supabase keys not set — skipping RLS tests",
  );

  test("User A can read messages where they are the sender", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Seed A→B message via service role (both users have profiles from globalSetup)
    const { data: seeded, error: seedError } = await admin
      .from("messages")
      .insert({ sender_id: userA.id, receiver_id: userB.id, content: "rls-sender-read-test" })
      .select("id")
      .single();

    expect(seedError, `Seed error: ${JSON.stringify(seedError)}`).toBeNull();
    const messageId = seeded!.id;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userClient.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { data: rows, error: fetchError } = await userClient
      .from("messages")
      .select("id")
      .eq("id", messageId);

    expect(fetchError).toBeNull();
    expect(rows).toHaveLength(1);

    await admin.from("messages").delete().eq("id", messageId);
  });

  test("User B can read messages where they are the receiver", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: seeded, error: seedError } = await admin
      .from("messages")
      .insert({ sender_id: userA.id, receiver_id: userB.id, content: "rls-receiver-read-test" })
      .select("id")
      .single();

    expect(seedError, `Seed error: ${JSON.stringify(seedError)}`).toBeNull();
    const messageId = seeded!.id;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userClient.auth.signInWithPassword({ email: userB.email, password: userB.password });

    const { data: rows, error: fetchError } = await userClient
      .from("messages")
      .select("id")
      .eq("id", messageId);

    expect(fetchError).toBeNull();
    expect(rows).toHaveLength(1);

    await admin.from("messages").delete().eq("id", messageId);
  });

  test("User A cannot read a message they are not party to", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create a temporary third user and their profile for this test
    const tempEmail = `e2e_rls_c_${Date.now()}@mailinator.com`;
    const { data: userCData, error: createError } = await (admin.auth as any).admin.createUser({
      email: tempEmail,
      password: "Test1234!",
      email_confirm: true,
    });
    if (createError) {
      test.skip(true, `Could not create temp user: ${createError.message}`);
      return;
    }
    const userCId: string = userCData.user.id;

    try {
      await admin.from("profiles").insert({ user_id: userCId, name: "E2E User C" });

      // Seed a C→B message — userA is not involved at all
      const { data: seeded, error: seedError } = await admin
        .from("messages")
        .insert({ sender_id: userCId, receiver_id: userB.id, content: "rls-isolation-test" })
        .select("id")
        .single();

      expect(seedError, `Seed error: ${JSON.stringify(seedError)}`).toBeNull();
      const messageId = seeded!.id;

      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await userClient.auth.signInWithPassword({ email: userA.email, password: userA.password });

      // userA attempts to read the C→B message — RLS should block it
      const { data: rows, error: fetchError } = await userClient
        .from("messages")
        .select("id")
        .eq("id", messageId);

      if (fetchError) {
        expect(fetchError.message).toMatch(/row.level security|permission denied/i);
      } else {
        expect(rows).toHaveLength(0);
      }

      await admin.from("messages").delete().eq("id", messageId);
    } finally {
      await admin.from("profiles").delete().eq("user_id", userCId);
      await (admin.auth as any).admin.deleteUser(userCId);
    }
  });

  test("User B cannot read a message they are not party to", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tempEmail = `e2e_rls_c2_${Date.now()}@mailinator.com`;
    const { data: userCData, error: createError } = await (admin.auth as any).admin.createUser({
      email: tempEmail,
      password: "Test1234!",
      email_confirm: true,
    });
    if (createError) {
      test.skip(true, `Could not create temp user: ${createError.message}`);
      return;
    }
    const userCId: string = userCData.user.id;

    try {
      await admin.from("profiles").insert({ user_id: userCId, name: "E2E User C2" });

      // Seed a C→A message — userB is not involved at all
      const { data: seeded, error: seedError } = await admin
        .from("messages")
        .insert({ sender_id: userCId, receiver_id: userA.id, content: "rls-isolation-test-2" })
        .select("id")
        .single();

      expect(seedError, `Seed error: ${JSON.stringify(seedError)}`).toBeNull();
      const messageId = seeded!.id;

      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await userClient.auth.signInWithPassword({ email: userB.email, password: userB.password });

      const { data: rows, error: fetchError } = await userClient
        .from("messages")
        .select("id")
        .eq("id", messageId);

      if (fetchError) {
        expect(fetchError.message).toMatch(/row.level security|permission denied/i);
      } else {
        expect(rows).toHaveLength(0);
      }

      await admin.from("messages").delete().eq("id", messageId);
    } finally {
      await admin.from("profiles").delete().eq("user_id", userCId);
      await (admin.auth as any).admin.deleteUser(userCId);
    }
  });
});
