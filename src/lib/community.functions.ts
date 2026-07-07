import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Admin session gate (mirrors admin.functions.ts) ----------

function getSessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return {
    password,
    name: "idm-admin-gate",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
      partitioned: true,
    },
  };
}

type AdminSession = { unlocked?: boolean };

async function requireUnlocked() {
  const session = await useSession<AdminSession>(getSessionConfig());
  if (!session.data.unlocked) throw new Error("Locked");
  return session;
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- User-facing: request moderator access ----------

export const getMyModStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const admin = await loadAdmin();
    const [{ data: roles }, { data: requests }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin
        .from("moderator_requests")
        .select("id, status, message, created_at, reviewed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const roleSet = new Set((roles ?? []).map((r) => r.role as string));
    const hasApprovedRequest = (requests ?? []).some((r) => r.status === "approved");
    return {
      isModerator: roleSet.has("moderator") || roleSet.has("admin") || hasApprovedRequest,
      isAdmin: roleSet.has("admin"),
      requests: requests ?? [],
    };
  });

export const requestModeratorAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const message = String(r.message ?? "").trim().slice(0, 500);
    return { message };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Block duplicate pending
    const { data: existing } = await supabase
      .from("moderator_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      return { ok: false as const, reason: "already_pending" };
    }
    const { error } = await supabase
      .from("moderator_requests")
      .insert({ user_id: userId, message: data.message || null });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Public: list approved community games ----------

export const listApprovedCommunityGames = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await loadAdmin();
  const { data, error } = await admin
    .from("community_games")
    .select("id, game_type, title, description, topic, author_id, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  // Attach author display names
  const ids = Array.from(new Set((data ?? []).map((g) => g.author_id)));
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, display_name, username").in("id", ids)
    : { data: [] as { id: string; display_name: string | null; username: string | null }[] };
  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name || p.username || "Модератор";
  }
  return (data ?? []).map((g) => ({ ...g, author_name: nameMap[g.author_id] ?? "Модератор" }));
});

export const getApprovedCommunityGame = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const id = String(r.id ?? "");
    if (!id) throw new Error("Missing id");
    return { id };
  })
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const { data: g, error } = await admin
      .from("community_games")
      .select("id, game_type, title, description, topic, author_id, content, created_at, status")
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) throw new Error("Играта не е намерена");
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", g.author_id)
      .maybeSingle();
    return {
      ...g,
      author_name: profile?.display_name || profile?.username || "Модератор",
    };
  });

// ---------- Admin: moderator requests ----------

export const adminListModRequests = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const admin = await loadAdmin();
  const { data, error } = await admin
    .from("moderator_requests")
    .select("id, user_id, message, status, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, display_name, username").in("id", ids)
    : { data: [] as { id: string; display_name: string | null; username: string | null }[] };
  const nameMap: Record<string, { name: string; username: string | null }> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = { name: p.display_name || p.username || "—", username: p.username };
  }
  return (data ?? []).map((r) => ({
    ...r,
    display_name: nameMap[r.user_id]?.name ?? "—",
    username: nameMap[r.user_id]?.username ?? null,
  }));
});

export const adminReviewModRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const id = String(r.id ?? "");
    const action = String(r.action ?? "");
    if (!id || (action !== "approve" && action !== "reject")) {
      throw new Error("Invalid input");
    }
    return { id, action: action as "approve" | "reject" };
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
    const admin = await loadAdmin();
    const { data: req, error: reqErr } = await admin
      .from("moderator_requests")
      .select("user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr || !req) throw new Error("Заявката не е намерена");
    if (req.status !== "pending") throw new Error("Вече е обработена");

    if (data.action === "approve") {
      // Grant moderator role (idempotent thanks to UNIQUE)
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: req.user_id, role: "moderator" as never }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(roleErr.message);
    }

    const { error } = await admin
      .from("moderator_requests")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Admin: pending community games ----------

export const adminListPendingGames = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const admin = await loadAdmin();
  const { data, error } = await admin
    .from("community_games")
    .select("id, author_id, game_type, title, description, topic, status, created_at")
    .in("status", ["pending", "rejected"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminReviewGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const id = String(r.id ?? "");
    const action = String(r.action ?? "");
    const reason = r.reason ? String(r.reason).slice(0, 300) : null;
    if (!id || (action !== "approve" && action !== "reject" && action !== "delete")) {
      throw new Error("Invalid input");
    }
    return { id, action: action as "approve" | "reject" | "delete", reason };
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
    const admin = await loadAdmin();
    if (data.action === "delete") {
      const { error } = await admin.from("community_games").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const { error } = await admin
      .from("community_games")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        reject_reason: data.action === "reject" ? data.reason : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
