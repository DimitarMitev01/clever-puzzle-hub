import { createServerFn } from "@tanstack/react-start";

export const trackVisit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const visitorId = String(r.visitorId ?? "").slice(0, 64);
    const path = r.path ? String(r.path).slice(0, 256) : null;
    if (!visitorId) throw new Error("Missing visitorId");
    return { visitorId, path };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("site_visits").insert({
      visitor_id: data.visitorId,
      path: data.path,
    });
    return { ok: true as const };
  });
