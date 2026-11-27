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
import { createTestUser, readTestUsers } from "./helpers/auth";

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

  test("contact form: honest submissions go through, spoofed ones are rejected", async () => {
    const { userA, userB } = readTestUsers();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const marker = `rls-contact-${Date.now()}`;
    const base = { name: "RLS Test", email: "rls@example.com", subject: "general", message: marker };

    const visitor = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const member = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await member.auth.signInWithPassword({ email: userA.email, password: userA.password });

    try {
      // Allowed: a visitor with no user id, and a member with their own id.
      const asVisitor = await visitor.from("contact_submissions").insert({ ...base, user_id: null });
      expect(asVisitor.error, JSON.stringify(asVisitor.error)).toBeNull();
      const asSelf = await member.from("contact_submissions").insert({ ...base, user_id: userA.id });
      expect(asSelf.error, JSON.stringify(asSelf.error)).toBeNull();

      // Rejected: another member's id, pre-set admin fields, oversized message.
      const spoofed = await member.from("contact_submissions").insert({ ...base, user_id: userB.id });
      expect(spoofed.error?.message ?? "").toMatch(/row-level security/i);
      const anonSpoof = await visitor.from("contact_submissions").insert({ ...base, user_id: userB.id });
      expect(anonSpoof.error?.message ?? "").toMatch(/row-level security/i);
      const preResolved = await visitor
        .from("contact_submissions")
        .insert({ ...base, user_id: null, status: "resolved", admin_notes: "x" });
      expect(preResolved.error?.message ?? "").toMatch(/row-level security/i);
      const huge = await visitor
        .from("contact_submissions")
        .insert({ ...base, user_id: null, message: marker + "x".repeat(6000) });
      expect(huge.error?.message ?? "").toMatch(/row-level security/i);

      // Exactly the two honest rows exist.
      const { count } = await admin
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .like("message", `${marker}%`);
      expect(count).toBe(2);
    } finally {
      await admin.from("contact_submissions").delete().like("message", `${marker}%`);
    }
  });

  // Needs migration 20261127000000_enforce-blocks.sql on the E2E project.
  test("a block is enforced by the database: no likes, messages or calls either way", async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const blocker = await createTestUser("rls_blocker", { profile: true });
    const blocked = await createTestUser("rls_blocked", { profile: true });
    const asUser = async (u: { email: string; password: string }) => {
      const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      await c.auth.signInWithPassword({ email: u.email, password: u.password });
      return c;
    };
    const blockerClient = await asUser(blocker);
    const blockedClient = await asUser(blocked);
    const likesBetween = async () => {
      const { count } = await admin
        .from("likes")
        .select("id", { count: "exact", head: true })
        .or(
          `and(user_id.eq.${blocker.id},liked_user_id.eq.${blocked.id}),and(user_id.eq.${blocked.id},liked_user_id.eq.${blocker.id})`,
        );
      return count;
    };
    const superLikesBetween = async () => {
      const { count } = await admin
        .from("super_likes")
        .select("id", { count: "exact", head: true })
        .or(
          `and(user_id.eq.${blocker.id},super_liked_user_id.eq.${blocked.id}),and(user_id.eq.${blocked.id},super_liked_user_id.eq.${blocker.id})`,
        );
      return count;
    };

    // They match, and the to-be-blocked member also sent a Super Like
    await blockerClient.from("likes").insert({ user_id: blocker.id, liked_user_id: blocked.id });
    await blockedClient.from("likes").insert({ user_id: blocked.id, liked_user_id: blocker.id });
    await blockedClient.from("super_likes").insert({ user_id: blocked.id, super_liked_user_id: blocker.id });
    const before = await blockedClient.rpc("are_users_matched", { p_user1_id: blocked.id, p_user2_id: blocker.id });
    expect(before.data).toBe(true);

    // The block alone (no client-side like delete) clears likes both ways
    const block = await blockerClient.from("blocked_users").insert({ blocker_id: blocker.id, blocked_id: blocked.id });
    expect(block.error, JSON.stringify(block.error)).toBeNull();
    expect(await likesBetween()).toBe(0);
    expect(await superLikesBetween()).toBe(0);

    // New likes / Super Likes from the blocked member are dropped without an error
    const reLike = await blockedClient.from("likes").insert({ user_id: blocked.id, liked_user_id: blocker.id });
    expect(reLike.error, JSON.stringify(reLike.error)).toBeNull();
    await blockedClient.from("super_likes").insert({ user_id: blocked.id, super_liked_user_id: blocker.id });
    expect(await likesBetween()).toBe(0);
    expect(await superLikesBetween()).toBe(0);

    // Neither can message or call the other
    const after = await blockedClient.rpc("are_users_matched", { p_user1_id: blocked.id, p_user2_id: blocker.id });
    expect(after.data).toBe(false);
    for (const [client, from, to] of [
      [blockedClient, blocked, blocker],
      [blockerClient, blocker, blocked],
    ] as const) {
      const msg = await client.from("messages").insert({ sender_id: from.id, receiver_id: to.id, content: "rls-block-test" });
      expect(msg.error?.message ?? "").toMatch(/row-level security/i);
      // Calls: the daily-room function checks are_users_matched (false above);
      // the call_signals policy uses the same check.
      const call = await client
        .from("call_signals")
        .insert({ caller_id: from.id, receiver_id: to.id, signal_type: "offer", signal_data: {} });
      expect(call.error?.message ?? "").toMatch(/row-level security/i);
    }

    // The blocked member can't see the block or the blocker's profile
    const { data: blocks } = await blockedClient.from("blocked_users").select("id");
    expect(blocks ?? []).toHaveLength(0);
    const { data: profile } = await blockedClient.from("profiles").select("id").eq("user_id", blocker.id);
    expect(profile ?? []).toHaveLength(0);
    // globalTeardown deletes both users and their rows
  });
});
