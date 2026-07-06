import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GameType = "crossword" | "quiz" | "math_sprint";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function requireMod(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = new Set((data ?? []).map((r: any) => r.role));
  if (!roles.has("moderator") && !roles.has("admin")) {
    throw new Error("Нямаш модераторски достъп");
  }
}

// ---------- AI Draft ----------

function buildPrompt(type: GameType, topic: string, opts: Record<string, unknown>) {
  const count = Number(opts.count ?? 8);
  if (type === "quiz") {
    return `Създай куиз на български език по темата "${topic}". Върни точно ${count} въпроса.
Всеки въпрос трябва да има точно 4 възможни отговора и един верен.
Отговори САМО с валиден JSON във формата:
{"questions":[{"q":"...","options":["A","B","C","D"],"correctIndex":0}]}`;
  }
  if (type === "crossword") {
    return `Създай списък от думи за кръстословица на български език по темата "${topic}".
Върни точно ${count} двойки дума + кратко описание (подсказка).
Думите трябва да са с главни букви, без интервали, без специални символи.
Отговори САМО с валиден JSON във формата:
{"words":[{"word":"ДУМА","clue":"кратко описание"}]}`;
  }
  // math_sprint
  const difficulty = String(opts.difficulty ?? "medium");
  const duration = Number(opts.duration ?? 60);
  const ops = Array.isArray(opts.operations) ? opts.operations : ["+", "-", "×"];
  return `Дай кратко описание (2-3 изречения на български) за Math Sprint предизвикателство:
тема "${topic}", трудност "${difficulty}", продължителност ${duration} секунди, операции ${ops.join(", ")}.
Отговори САМО с валиден JSON: {"intro":"..."}`;
}

export const aiDraftGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const type = String(r.type ?? "") as GameType;
    const topic = String(r.topic ?? "").trim().slice(0, 200);
    const options = (r.options ?? {}) as Record<string, unknown>;
    if (!["crossword", "quiz", "math_sprint"].includes(type)) throw new Error("Invalid type");
    if (!topic) throw new Error("Темата е задължителна");
    return { type, topic, options };
  })
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY не е конфигуриран");

    const prompt = buildPrompt(data.type, data.topic, data.options);
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Ти си помощник, който генерира съдържание за игри. Винаги отговаряй само с валиден JSON без обяснения и без markdown ограждения.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Твърде много заявки, опитай отново след минута");
      if (res.status === 402) throw new Error("Изчерпан AI кредит — свържи се с админ");
      throw new Error(`AI грешка: ${res.status} ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    let text: string = json?.choices?.[0]?.message?.content ?? "";
    // Strip potential ```json fences
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("AI върна невалиден JSON, опитай отново");
    }
    return { draft: parsed };
  });

// ---------- Submit game ----------

export const submitCommunityGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const r = (d ?? {}) as Record<string, unknown>;
    const type = String(r.type ?? "") as GameType;
    const title = String(r.title ?? "").trim().slice(0, 120);
    const description = r.description ? String(r.description).trim().slice(0, 500) : null;
    const topic = r.topic ? String(r.topic).trim().slice(0, 200) : null;
    const content = r.content ?? {};
    if (!["crossword", "quiz", "math_sprint"].includes(type)) throw new Error("Invalid type");
    if (!title) throw new Error("Заглавието е задължително");
    return { type, title, description, topic, content };
  })
  .handler(async ({ data, context }) => {
    await requireMod(context.supabase, context.userId);
    const { error } = await context.supabase.from("community_games").insert({
      author_id: context.userId,
      game_type: data.type,
      title: data.title,
      description: data.description,
      topic: data.topic,
      content: data.content as never,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- List my games ----------

export const listMyGames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("community_games")
      .select("id, game_type, title, status, reject_reason, created_at, reviewed_at")
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
