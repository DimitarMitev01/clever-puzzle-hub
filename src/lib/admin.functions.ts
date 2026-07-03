import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const sessionConfig = {
  password: process.env.ADMIN_SESSION_SECRET ?? "dev-only-fallback-secret-change-me-please-32chars",
  name: "idm-admin-gate",
  maxAge: 60 * 60 * 8, // 8 hours
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
};

type AdminSession = { unlocked?: boolean };

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireUnlocked() {
  const session = await useSession<AdminSession>(sessionConfig);
  if (!session.data.unlocked) throw new Error("Locked");
  return session;
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const isAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  return { unlocked: Boolean(session.data.unlocked) };
});

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const password = String(r.password ?? "");
    if (!password) throw new Error("Missing password");
    return { password };
  })
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PANEL_PASSWORD;
    if (!expected) throw new Error("Админ паролата не е конфигурирана на сървъра.");
    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(sessionConfig);
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
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

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const admin = await loadAdmin();
  const [{ data: profiles }, { data: scoreAgg }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("game_scores").select("user_id"),
  ]);
  const playMap: Record<string, number> = {};
  for (const s of scoreAgg ?? []) {
    playMap[s.user_id] = (playMap[s.user_id] ?? 0) + 1;
  }
  return (profiles ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    created_at: p.created_at,
    plays: playMap[p.id] ?? 0,
  }));
});

export const adminListScores = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    return { gameSlug: r.gameSlug ? String(r.gameSlug) : null };
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
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
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const id = String(r.id ?? "");
    if (!id) throw new Error("Missing id");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
    const admin = await loadAdmin();
    const { error } = await admin.from("game_scores").delete().eq("id", data.id);
    if (error) throw new Error("Failed to delete");
    return { ok: true as const };
  });
