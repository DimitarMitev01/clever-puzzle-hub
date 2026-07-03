import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: Boolean(data) };
  });

// Bootstrap: first user in the system can claim admin if there are no admins yet.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await loadAdmin();
    const { count, error: cErr } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error("Failed to check admins");
    if ((count ?? 0) > 0) throw new Error("Admin already exists");
    const { error } = await admin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Failed to grant admin");
    return { ok: true as const };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await loadAdmin();
    const [{ count: users }, { count: scores }, { data: perGame }] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("game_scores").select("id", { count: "exact", head: true }),
      admin.from("game_scores").select("game_slug, score").order("score", { ascending: false }).limit(1000),
    ]);
    const byGame: Record<string, { plays: number; top: number }> = {};
    for (const r of perGame ?? []) {
      const g = byGame[r.game_slug] ?? { plays: 0, top: 0 };
      g.plays += 1;
      if (r.score > g.top) g.top = r.score;
      byGame[r.game_slug] = g;
    }
    return { users: users ?? 0, scores: scores ?? 0, byGame };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await loadAdmin();
    const [{ data: profiles }, { data: roles }, { data: scoreAgg }] = await Promise.all([
      admin.from("profiles").select("id, username, display_name, created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("user_roles").select("user_id, role"),
      admin.from("game_scores").select("user_id"),
    ]);
    const roleMap: Record<string, string[]> = {};
    for (const r of roles ?? []) {
      (roleMap[r.user_id] ??= []).push(r.role as string);
    }
    const playMap: Record<string, number> = {};
    for (const s of scoreAgg ?? []) {
      playMap[s.user_id] = (playMap[s.user_id] ?? 0) + 1;
    }
    return (profiles ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: roleMap[p.id] ?? [],
      plays: playMap[p.id] ?? 0,
    }));
  });

export const adminListScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    return { gameSlug: r.gameSlug ? String(r.gameSlug) : null };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await loadAdmin();
    let q = admin
      .from("game_scores")
      .select("id, user_id, game_slug, score, duration_seconds, won, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.gameSlug) q = q.eq("game_slug", data.gameSlug);
    const { data: rows, error } = await q;
    if (error) throw new Error("Failed to load scores");
    return rows ?? [];
  });

export const adminDeleteScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const id = String(r.id ?? "");
    if (!id) throw new Error("Missing id");
    return { id };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = await loadAdmin();
    const { error } = await admin.from("game_scores").delete().eq("id", data.id);
    if (error) throw new Error("Failed to delete");
    return { ok: true as const };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const userId = String(r.userId ?? "");
    const role = String(r.role ?? "");
    const grant = Boolean(r.grant);
    if (!userId) throw new Error("Missing userId");
    if (!["admin", "moderator", "user"].includes(role)) throw new Error("Bad role");
    return { userId, role: role as "admin" | "moderator" | "user", grant };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("Cannot remove your own admin role");
    }
    const admin = await loadAdmin();
    if (data.grant) {
      const { error } = await admin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (error && !String(error.message).includes("duplicate")) throw new Error("Failed to grant");
    } else {
      const { error } = await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error("Failed to revoke");
    }
    return { ok: true as const };
  });
