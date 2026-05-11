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

  test("User B cannot read a message sent between User A and User A", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Seed a message that belongs only to userA (self-message)
    const { data: seeded, error: seedError } = await admin
      .from("messages")
      .insert({ sender_id: userA.id, receiver_id: userA.id, content: "rls-test-private" })
      .select("id")
      .single();

    expect(seedError).toBeNull();
    const messageId = seeded!.id;

    // Authenticate as userB using their password
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: userB.email,
      password: userB.password,
    });
    expect(signInError).toBeNull();

    // userB attempts to read the message — RLS should block it
    const { data: rows, error: fetchError } = await userClient
      .from("messages")
      .select("id")
      .eq("id", messageId);

    // Either an RLS error or an empty result — both prove isolation
    if (fetchError) {
      expect(fetchError.message).toMatch(/row.level security|permission denied/i);
    } else {
      expect(rows).toHaveLength(0);
    }

    // Cleanup
    await admin.from("messages").delete().eq("id", messageId);
  });

  test("User A cannot read messages sent by User B to User B", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: seeded, error: seedError } = await admin
      .from("messages")
      .insert({ sender_id: userB.id, receiver_id: userB.id, content: "rls-test-b-private" })
      .select("id")
      .single();

    expect(seedError).toBeNull();
    const messageId = seeded!.id;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });
    expect(signInError).toBeNull();

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
  });

  test("User A can read messages where they are the sender", async () => {
    const { userA, userB } = readTestUsers();

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: seeded, error: seedError } = await admin
      .from("messages")
      .insert({ sender_id: userA.id, receiver_id: userB.id, content: "rls-test-a-to-b" })
      .select("id")
      .single();

    expect(seedError).toBeNull();
    const messageId = seeded!.id;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userClient.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });

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
      .insert({ sender_id: userA.id, receiver_id: userB.id, content: "rls-test-receiver" })
      .select("id")
      .single();

    expect(seedError).toBeNull();
    const messageId = seeded!.id;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userClient.auth.signInWithPassword({
      email: userB.email,
      password: userB.password,
    });

    const { data: rows, error: fetchError } = await userClient
      .from("messages")
      .select("id")
      .eq("id", messageId);

    expect(fetchError).toBeNull();
    expect(rows).toHaveLength(1);

    await admin.from("messages").delete().eq("id", messageId);
  });
});
